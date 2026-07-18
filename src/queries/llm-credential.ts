import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  llmCredentials,
  type LlmCredential,
  type NewLlmCredential,
} from "@/db/schema";

export async function getLlmCredentialByUserId(
  userId: string,
): Promise<LlmCredential | undefined> {
  const [credential] = await db
    .select()
    .from(llmCredentials)
    .where(eq(llmCredentials.userId, userId));
  return credential;
}

export type LlmCredentialPatch = Pick<
  NewLlmCredential,
  "provider" | "apiKey" | "keyPreview"
>;

/** Crée ou remplace la clé LLM de l'utilisateur (une ligne par user). */
export async function upsertLlmCredential(
  userId: string,
  patch: LlmCredentialPatch,
): Promise<LlmCredential> {
  const [credential] = await db
    .insert(llmCredentials)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: llmCredentials.userId, set: patch })
    .returning();
  return credential;
}

export async function deleteLlmCredential(userId: string): Promise<void> {
  await db.delete(llmCredentials).where(eq(llmCredentials.userId, userId));
}
