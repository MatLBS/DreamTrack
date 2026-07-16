import { ServiceError, type ServiceErrorCode } from "@/services/errors";

export type ActionErrorCode = ServiceErrorCode | "UNKNOWN";

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; code: ActionErrorCode; message: string };

/** Uniformise une action serveur : capture `ServiceError` en résultat sérialisable. */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: "UNKNOWN", message: "Unexpected error" };
  }
}
