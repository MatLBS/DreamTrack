"use server";

import { revalidatePath } from "next/cache";

import type { CoverLetterRow } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import type {
  GenerateCoverLetterInput,
  SaveCoverLetterInput,
} from "@/lib/validation/cover-letter";
import {
  generateCoverLetter,
  listUserCoverLetters,
  removeCoverLetter,
  saveCoverLetter,
  updateCoverLetterText,
  type CoverLetterDraft,
} from "@/services/cover-letter";

import { runAction, type ActionResult } from "./result";

export async function generateCoverLetterAction(
  input: GenerateCoverLetterInput,
): Promise<ActionResult<CoverLetterDraft>> {
  return runAction(async () => {
    const session = await requireAuth();
    return generateCoverLetter(session.user.id, input);
  });
}

export async function saveCoverLetterAction(
  input: SaveCoverLetterInput,
): Promise<ActionResult<CoverLetterRow>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return saveCoverLetter(session.user.id, input);
  });
  if (result.ok) revalidatePath("/workshop");
  return result;
}

export async function updateCoverLetterAction(
  id: string,
  paragraphs: string[],
): Promise<ActionResult<CoverLetterRow>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return updateCoverLetterText(session.user.id, id, paragraphs);
  });
  if (result.ok) revalidatePath("/workshop");
  return result;
}

export async function listCoverLettersAction(): Promise<
  ActionResult<CoverLetterRow[]>
> {
  return runAction(async () => {
    const session = await requireAuth();
    return listUserCoverLetters(session.user.id);
  });
}

export async function deleteCoverLetterAction(
  id: string,
): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return removeCoverLetter(session.user.id, id);
  });
  if (result.ok) revalidatePath("/workshop");
  return result;
}
