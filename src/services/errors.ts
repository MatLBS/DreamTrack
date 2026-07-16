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
  | "IMAGE_TOO_LARGE";

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
