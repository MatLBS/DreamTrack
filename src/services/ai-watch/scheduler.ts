import cron from "node-cron";

import type { AiWatchConfig } from "@/db/schema";
import { emitRunEvent } from "@/lib/ai-watch/run-events";
import {
  insertOffers,
  listDueConfigs,
  markRunFinished,
} from "@/queries/ai-watch";
import { getProfile } from "@/services/profile";
import { resolveLlmCredential } from "@/services/llm-credential";

import { resolvePipeline } from "./pipeline";

/** Battement du cron : fréquence à laquelle on vérifie qui est dû, pas la récurrence choisie
 * par l'utilisateur (stockée dans `ai_watch_configs.interval_minutes`). */
const TICK_CRON_EXPRESSION = "*/30 * * * *";

/** Fonction pure : cœur testable de l'ordonnancement. */
export function isDue(config: AiWatchConfig, now: Date): boolean {
  if (!config.enabled) return false;
  if (config.lastRunAt === null) return true;
  const elapsedMs = now.getTime() - config.lastRunAt.getTime();
  return elapsedMs >= config.intervalMinutes * 60_000;
}

export class RunInProgressError extends Error {}

/** Empêche qu'un déclenchement manuel double un run planifié pour le même utilisateur. */
const runningUserIds = new Set<string>();

export async function runForUser(userId: string): Promise<void> {
  if (runningUserIds.has(userId)) {
    throw new RunInProgressError(
      `A run is already in progress for user ${userId}`,
    );
  }
  runningUserIds.add(userId);

  const onProgress = (step: string, detail?: string) => {
    emitRunEvent(userId, { type: "run:progress", step, detail });
  };

  try {
    emitRunEvent(userId, { type: "run:started" });

    const profile = await getProfile(userId);
    if (!profile) {
      throw new Error("No profile configured for this user");
    }
    const { provider, apiKey, modelScoring } =
      await resolveLlmCredential(userId);

    const offers = await resolvePipeline().run(
      { userId, profile, provider, apiKey, modelScoring },
      onProgress,
    );

    await insertOffers(
      userId,
      offers.map(
        ({
          source,
          externalId,
          company,
          role,
          url,
          location,
          description,
          matchScore,
          matchReason,
        }) => ({
          source,
          externalId,
          company,
          role,
          url,
          location,
          description,
          matchScore,
          matchReason,
        }),
      ),
    );

    await markRunFinished(userId, "success", null);
    emitRunEvent(userId, { type: "run:finished", offerCount: offers.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markRunFinished(userId, "error", message);
    emitRunEvent(userId, { type: "run:error", message });
    throw error;
  } finally {
    runningUserIds.delete(userId);
  }
}

export async function runTick(now: Date = new Date()): Promise<void> {
  const dueConfigs = await listDueConfigs(now);
  for (const config of dueConfigs) {
    try {
      await runForUser(config.userId);
    } catch {
      // L'échec est déjà persisté (lastRunStatus) et diffusé (run:error) par runForUser.
      // On continue avec les autres utilisateurs dus.
    }
  }
}

let started = false;

/** Démarre le cron (idempotent) — appelé depuis `instrumentation.ts` au démarrage du serveur. */
export function startScheduler(): void {
  if (started) return;
  started = true;
  cron.schedule(TICK_CRON_EXPRESSION, () => runTick(), { noOverlap: true });
}
