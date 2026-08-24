"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth-guard";
import type { CreateApiKeyInput } from "@/lib/validation/api-key";
import {
  createApiKey,
  listApiKeys,
  revokeApiKeyForUser,
  type ApiKeySummary,
  type CreatedApiKey,
} from "@/services/api-key";

import { runAction, type ActionResult } from "./result";

/**
 * Lecture rejouable côté client : sert de `queryFn` à TanStack Query pour
 * refetch après invalidation (pas de route API, on rappelle le service via
 * Server Action — voir `app/actions/board.ts`).
 */
export async function listApiKeysAction(): Promise<ApiKeySummary[]> {
  const session = await requireAuth();
  return listApiKeys(session.user.id);
}

export async function createApiKeyAction(
  input: CreateApiKeyInput,
): Promise<ActionResult<CreatedApiKey>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return createApiKey(session.user.id, input);
  });
  if (result.ok) revalidatePath("/profile");
  return result;
}

export async function revokeApiKeyAction(
  id: string,
): Promise<ActionResult<ApiKeySummary>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return revokeApiKeyForUser(session.user.id, id);
  });
  if (result.ok) revalidatePath("/profile");
  return result;
}
