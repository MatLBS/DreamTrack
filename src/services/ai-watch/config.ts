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

/** Déclenchement manuel ("Lancer maintenant") — exige une configuration existante
 * et refuse si un run est déjà en cours pour cet utilisateur. */
export async function triggerRun(userId: string): Promise<void> {
  const config = await getConfigByUserId(userId);
  if (!config) {
    throw new ServiceError(
      "AI_WATCH_CONFIG_NOT_FOUND",
      "No watch configuration for this user",
    );
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
