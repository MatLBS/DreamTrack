import type { AiWatchConfig, JobOffer } from "@/db/schema";
import {
  DismissOfferSchema,
  SaveAiWatchConfigSchema,
  type DismissOfferInput,
  type SaveAiWatchConfigInput,
} from "@/lib/validation/ai-watch";
import {
  dismissOffer as dismissOfferQuery,
  getConfigByUserId,
  getOfferById,
  listOffersByUserId,
  upsertConfig,
} from "@/queries/ai-watch";

import { parseInput, ServiceError } from "../errors";
import { runForUser, RunInProgressError } from "./scheduler";

export async function getConfig(userId: string): Promise<AiWatchConfig | null> {
  const config = await getConfigByUserId(userId);
  return config ?? null;
}

export async function saveConfig(
  userId: string,
  input: SaveAiWatchConfigInput,
): Promise<AiWatchConfig> {
  const patch = parseInput(SaveAiWatchConfigSchema, input);
  return upsertConfig(userId, patch);
}

export async function listOffers(userId: string): Promise<JobOffer[]> {
  return listOffersByUserId(userId);
}

export async function dismissOfferForUser(
  userId: string,
  input: DismissOfferInput,
): Promise<void> {
  const { offerId } = parseInput(DismissOfferSchema, input);
  const offer = await getOfferById(offerId);
  if (!offer || offer.userId !== userId) {
    throw new ServiceError("OFFER_NOT_FOUND", "Offer not found");
  }
  await dismissOfferQuery(offerId);
}

/** Déclenchement manuel ("Lancer maintenant") — crée une configuration avec des
 * valeurs par défaut conservatives si elle n'existe pas, et refuse si un run
 * est déjà en cours pour cet utilisateur. */
export async function triggerRun(userId: string): Promise<void> {
  let config = await getConfigByUserId(userId);
  if (!config) {
    // Auto-créer une config lors du premier run manuel avec des valeurs conservatives.
    // enabled=false garantit que le scheduler ne s'exécutera pas automatiquement.
    config = await upsertConfig(userId, {
      enabled: false,
      intervalMinutes: 1440,
    });
  }

  try {
    await runForUser(userId);
  } catch (error) {
    if (error instanceof RunInProgressError) {
      throw new ServiceError("AI_WATCH_RUN_IN_PROGRESS", error.message);
    }
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      "AI_WATCH_PIPELINE_FAILED",
      error instanceof Error ? error.message : "Pipeline failed",
    );
  }
}
