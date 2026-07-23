"use server";

import { revalidatePath } from "next/cache";

import type { AiWatchConfig, JobOffer } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import type {
  DismissOfferInput,
  SaveAiWatchConfigInput,
} from "@/lib/validation/ai-watch";
import {
  dismissOfferForUser,
  listOffers,
  saveConfig,
  triggerRun,
} from "@/services/ai-watch/config";

import { runAction, type ActionResult } from "./result";

export async function saveAiWatchConfigAction(
  input: SaveAiWatchConfigInput,
): Promise<ActionResult<AiWatchConfig>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return saveConfig(session.user.id, input);
  });
  if (result.ok) revalidatePath("/ai-watch");
  return result;
}

export async function triggerAiWatchRunAction(): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    await triggerRun(session.user.id);
  });
  if (result.ok) revalidatePath("/ai-watch");
  return result;
}

/** Lecture rejouable côté client : queryFn TanStack Query après invalidation via SSE. */
export async function listAiWatchOffersAction(): Promise<JobOffer[]> {
  const session = await requireAuth();
  return listOffers(session.user.id);
}

export async function dismissOfferAction(
  input: DismissOfferInput,
): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    await dismissOfferForUser(session.user.id, input);
  });
  if (result.ok) revalidatePath("/ai-watch");
  return result;
}
