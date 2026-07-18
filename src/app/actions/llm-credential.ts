"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth-guard";
import type { SaveLlmCredentialInput } from "@/lib/validation/llm-credential";
import {
  getLlmCredentialSummary,
  removeLlmCredential,
  saveLlmCredential,
  type LlmCredentialSummary,
} from "@/services/llm-credential";

import { runAction, type ActionResult } from "./result";

/**
 * Lecture rejouable côté client : sert de `queryFn` à TanStack Query pour
 * refetch après invalidation (pas de route API, on rappelle le service via
 * Server Action — voir `app/actions/board.ts`).
 */
export async function getLlmCredentialSummaryAction(): Promise<LlmCredentialSummary | null> {
  const session = await requireAuth();
  return getLlmCredentialSummary(session.user.id);
}

export async function saveLlmCredentialAction(
  input: SaveLlmCredentialInput,
): Promise<ActionResult<LlmCredentialSummary>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return saveLlmCredential(session.user.id, input);
  });
  if (result.ok) revalidatePath("/profile");
  return result;
}

export async function removeLlmCredentialAction(): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return removeLlmCredential(session.user.id);
  });
  if (result.ok) revalidatePath("/profile");
  return result;
}
