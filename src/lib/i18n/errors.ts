import type { ActionErrorCode } from "@/app/actions/result";

import type { Dictionary } from "./index";

export class ActionError extends Error {
  constructor(public readonly code: ActionErrorCode) {
    super(code);
    this.name = "ActionError";
  }
}

/** Wraps a better-auth client error so its `code` survives through TanStack Query's onError. */
export class AuthClientError extends Error {
  constructor(public readonly code?: string) {
    super(code ?? "UNKNOWN");
    this.name = "AuthClientError";
  }
}

export function actionErrorMessage(
  t: Dictionary,
  codeOrError: unknown,
): string {
  const code =
    codeOrError instanceof ActionError
      ? codeOrError.code
      : typeof codeOrError === "string"
        ? codeOrError
        : "UNKNOWN";
  const messages: Record<string, string> = t.errors;
  return messages[code] ?? t.errors.UNKNOWN;
}
