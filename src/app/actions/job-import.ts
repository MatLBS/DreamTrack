"use server";

import { requireAuth } from "@/lib/auth-guard";
import type { ImportJobFromUrlInput } from "@/lib/validation/job-import";
import { importJobFromUrl, type JobImportDraft } from "@/services/job-import";

import { runAction, type ActionResult } from "./result";

export async function importJobFromUrlAction(
  input: ImportJobFromUrlInput,
): Promise<ActionResult<JobImportDraft>> {
  return runAction(async () => {
    const session = await requireAuth();
    return importJobFromUrl(session.user.id, input);
  });
}
