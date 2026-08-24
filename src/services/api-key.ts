import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import {
  getApiKeyById,
  getApiKeyByLookupHash,
  insertApiKey,
  listApiKeysByUserId,
  markApiKeyRevoked,
  touchApiKeyLastUsed,
} from "@/queries/api-key";
import {
  CreateApiKeySchema,
  type CreateApiKeyInput,
} from "@/lib/validation/api-key";

import { parseInput, ServiceError } from "./errors";

const KEY_PREFIX = "dt_";
const SECRET_BYTES = 24;
/** Un write par heure max : éviter une écriture DB à chaque appel MCP. */
const LAST_USED_THROTTLE_MS = 60 * 60 * 1000;

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPreview: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

/** Le seul endroit où le token en clair existe — retourné une unique fois, à la création. */
export interface CreatedApiKey extends ApiKeySummary {
  token: string;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildKeyPreview(token: string): string {
  return `${KEY_PREFIX}…${token.slice(-4)}`;
}

function toSummary(apiKey: {
  id: string;
  name: string;
  keyPreview: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): ApiKeySummary {
  return {
    id: apiKey.id,
    name: apiKey.name,
    keyPreview: apiKey.keyPreview,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    revokedAt: apiKey.revokedAt,
    createdAt: apiKey.createdAt,
  };
}

export async function listApiKeys(userId: string): Promise<ApiKeySummary[]> {
  const keys = await listApiKeysByUserId(userId);
  return keys.map(toSummary);
}

export async function createApiKey(
  userId: string,
  input: CreateApiKeyInput,
): Promise<CreatedApiKey> {
  const { name, expiresInDays } = parseInput(CreateApiKeySchema, input);

  const token = `${KEY_PREFIX}${randomBytes(SECRET_BYTES).toString("base64url")}`;
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await insertApiKey({
    userId,
    name,
    lookupHash: sha256Hex(token),
    keyPreview: buildKeyPreview(token),
    expiresAt,
  });

  return { ...toSummary(apiKey), token };
}

export async function revokeApiKeyForUser(
  userId: string,
  id: string,
): Promise<ApiKeySummary> {
  const existing = await getApiKeyById(userId, id);
  if (!existing) {
    throw new ServiceError("API_KEY_NOT_FOUND", "API key not found");
  }
  const revoked = await markApiKeyRevoked(userId, id);
  if (!revoked) {
    throw new ServiceError("API_KEY_NOT_FOUND", "API key not found");
  }
  return toSummary(revoked);
}

/**
 * Bearer token → userId. Retourne `null` pour tout échec (préfixe invalide,
 * hash inconnu, clé révoquée ou expirée) : aucun signal distinguant les cas,
 * pour ne pas transformer l'endpoint en oracle.
 */
export async function resolveUserIdFromToken(
  token: string,
): Promise<string | null> {
  if (!token.startsWith(KEY_PREFIX)) return null;

  const lookupHash = sha256Hex(token);
  const record = await getApiKeyByLookupHash(lookupHash);
  if (!record) return null;

  // Défense en profondeur : la recherche indexée ci-dessus ne fuit pas de
  // timing, mais on compare explicitement en temps constant.
  const a = Buffer.from(record.lookupHash);
  const b = Buffer.from(lookupHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const now = new Date();
  if (record.revokedAt !== null) return null;
  if (record.expiresAt !== null && record.expiresAt <= now) return null;

  // Throttle : sinon chaque appel MCP écrirait en base.
  const staleness = record.lastUsedAt
    ? now.getTime() - record.lastUsedAt.getTime()
    : Infinity;
  if (staleness > LAST_USED_THROTTLE_MS) {
    void touchApiKeyLastUsed(record.id, now);
  }

  return record.userId;
}
