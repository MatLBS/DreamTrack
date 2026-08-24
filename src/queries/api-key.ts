import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { apiKeys, type ApiKey, type NewApiKey } from "@/db/schema";

export type NewApiKeyInput = Pick<
  NewApiKey,
  "userId" | "name" | "lookupHash" | "keyPreview" | "expiresAt"
>;

export async function insertApiKey(values: NewApiKeyInput): Promise<ApiKey> {
  const [apiKey] = await db.insert(apiKeys).values(values).returning();
  return apiKey;
}

/** Recherche par hash sur l'index unique — cœur de la vérification du bearer.
 * Volontairement non scopée par utilisateur : le hash *est* la revendication
 * d'identité, la scoper serait circulaire. */
export async function getApiKeyByLookupHash(
  lookupHash: string,
): Promise<ApiKey | undefined> {
  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.lookupHash, lookupHash));
  return apiKey;
}

export async function listApiKeysByUserId(userId: string): Promise<ApiKey[]> {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function getApiKeyById(
  userId: string,
  id: string,
): Promise<ApiKey | undefined> {
  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, id)));
  return apiKey;
}

export async function markApiKeyRevoked(
  userId: string,
  id: string,
): Promise<ApiKey | undefined> {
  const [apiKey] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, id)))
    .returning();
  return apiKey;
}

export async function touchApiKeyLastUsed(id: string, at: Date): Promise<void> {
  await db.update(apiKeys).set({ lastUsedAt: at }).where(eq(apiKeys.id, id));
}
