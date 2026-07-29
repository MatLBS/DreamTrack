import type { LlmProvider } from "@/lib/validation/llm-credential";
import {
  SaveLlmCredentialSchema,
  type SaveLlmCredentialInput,
} from "@/lib/validation/llm-credential";
import {
  deleteLlmCredential,
  getLlmCredentialByUserId,
  upsertLlmCredential,
} from "@/queries/llm-credential";

import { parseInput, ServiceError } from "./errors";

export interface LlmCredentialSummary {
  provider: LlmProvider;
  keyPreview: string;
  modelExtraction: string | null;
  modelScoring: string | null;
  updatedAt: Date;
}

export interface LlmCredentialSecret {
  provider: LlmProvider;
  apiKey: string;
  modelExtraction: string | null;
  modelScoring: string | null;
}

function buildKeyPreview(apiKey: string): string {
  return `${apiKey.slice(0, 7)}…${apiKey.slice(-4)}`;
}

/** Résumé public (jamais la clé en clair) — sûr à renvoyer au client. */
export async function getLlmCredentialSummary(
  userId: string,
): Promise<LlmCredentialSummary | null> {
  const credential = await getLlmCredentialByUserId(userId);
  if (!credential) return null;
  return {
    provider: credential.provider,
    keyPreview: credential.keyPreview,
    modelExtraction: credential.modelExtraction,
    modelScoring: credential.modelScoring,
    updatedAt: credential.updatedAt,
  };
}

export async function saveLlmCredential(
  userId: string,
  input: SaveLlmCredentialInput,
): Promise<LlmCredentialSummary> {
  const { provider, apiKey, modelExtraction, modelScoring } = parseInput(
    SaveLlmCredentialSchema,
    input,
  );
  const credential = await upsertLlmCredential(userId, {
    provider,
    apiKey,
    keyPreview: buildKeyPreview(apiKey),
    modelExtraction: modelExtraction ?? null,
    modelScoring: modelScoring ?? null,
  });
  return {
    provider: credential.provider,
    keyPreview: credential.keyPreview,
    modelExtraction: credential.modelExtraction,
    modelScoring: credential.modelScoring,
    updatedAt: credential.updatedAt,
  };
}

export async function removeLlmCredential(userId: string): Promise<void> {
  await deleteLlmCredential(userId);
}

/**
 * Lit la clé API de l'utilisateur — usage interne uniquement (service
 * d'import). Ne jamais exposer cette valeur à une server action / au client.
 */
export async function resolveLlmCredential(
  userId: string,
): Promise<LlmCredentialSecret> {
  const credential = await getLlmCredentialByUserId(userId);
  if (!credential) {
    throw new ServiceError(
      "LLM_KEY_MISSING",
      "No LLM API key configured for this user",
    );
  }
  return {
    provider: credential.provider,
    apiKey: credential.apiKey,
    modelExtraction: credential.modelExtraction,
    modelScoring: credential.modelScoring,
  };
}
