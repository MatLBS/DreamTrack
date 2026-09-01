import type { ZodType } from "zod";

export type ServiceErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "COLUMN_NOT_FOUND"
  | "APPLICATION_NOT_FOUND"
  | "ENTRY_COLUMN_CATEGORY"
  | "PROTECTED_COLUMN_REORDER"
  | "DEFAULT_COLUMN_DELETE"
  | "COLUMN_NOT_EMPTY"
  | "NO_COLUMNS"
  | "UNSUPPORTED_IMAGE_TYPE"
  | "IMAGE_TOO_LARGE"
  | "LLM_KEY_MISSING"
  | "LLM_KEY_INVALID"
  | "PAGE_FETCH_FAILED"
  | "PAGE_BLOCKED"
  | "NOT_A_JOB_POSTING"
  | "LLM_REQUEST_FAILED"
  | "AI_WATCH_CONFIG_NOT_FOUND"
  | "AI_WATCH_RUN_IN_PROGRESS"
  | "AI_WATCH_PIPELINE_FAILED"
  | "OFFER_NOT_FOUND"
  | "API_KEY_NOT_FOUND"
  | "UNSUPPORTED_DOCUMENT_TYPE"
  | "DOCUMENT_TOO_LARGE"
  | "EMBEDDING_PROVIDER_UNSUPPORTED"
  | "DOCUMENT_INGESTION_FAILED"
  | "DOCUMENT_NOT_FOUND";

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** Parse un input via un schéma Zod, en uniformisant l'échec en `ServiceError("VALIDATION")`. */
export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ServiceError("VALIDATION", result.error.message);
  }
  return result.data;
}
