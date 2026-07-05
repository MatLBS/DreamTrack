import type { ZodType } from "zod";

export type ServiceErrorCode = "NOT_FOUND" | "VALIDATION" | "CONFLICT";

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
