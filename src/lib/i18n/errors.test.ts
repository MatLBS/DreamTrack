import { describe, expect, it } from "vitest";

import type { ServiceErrorCode } from "@/services/errors";
import type { ActionErrorCode } from "@/app/actions/result";

import { fr } from "./fr";
import { en } from "./en";
import { ActionError, actionErrorMessage } from "./errors";

const SERVICE_ERROR_CODES: ServiceErrorCode[] = [
  "VALIDATION",
  "UNAUTHORIZED",
  "COLUMN_NOT_FOUND",
  "APPLICATION_NOT_FOUND",
  "ENTRY_COLUMN_CATEGORY",
  "PROTECTED_COLUMN_REORDER",
  "DEFAULT_COLUMN_DELETE",
  "COLUMN_NOT_EMPTY",
  "NO_COLUMNS",
  "UNSUPPORTED_IMAGE_TYPE",
  "IMAGE_TOO_LARGE",
  "AI_WATCH_CONFIG_NOT_FOUND",
  "AI_WATCH_RUN_IN_PROGRESS",
  "AI_WATCH_PIPELINE_FAILED",
  "OFFER_NOT_FOUND",
];

const ALL_CODES: ActionErrorCode[] = [...SERVICE_ERROR_CODES, "UNKNOWN"];

describe("actionErrorMessage", () => {
  it.each(ALL_CODES)("resolves a non-empty fr message for %s", (code) => {
    expect(
      actionErrorMessage(fr, new ActionError(code)).length,
    ).toBeGreaterThan(0);
  });

  it.each(ALL_CODES)("resolves a non-empty en message for %s", (code) => {
    expect(
      actionErrorMessage(en, new ActionError(code)).length,
    ).toBeGreaterThan(0);
  });

  it("falls back to UNKNOWN for an unrecognized string code", () => {
    expect(actionErrorMessage(fr, "BOGUS")).toBe(fr.errors.UNKNOWN);
    expect(actionErrorMessage(en, "BOGUS")).toBe(en.errors.UNKNOWN);
  });

  it("falls back to UNKNOWN for a non-ActionError, non-string value", () => {
    expect(actionErrorMessage(fr, new Error("plain error"))).toBe(
      fr.errors.UNKNOWN,
    );
    expect(actionErrorMessage(fr, undefined)).toBe(fr.errors.UNKNOWN);
  });
});
