import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  coverLetters,
  type CoverLetterRow,
  type NewCoverLetterRow,
} from "@/db/schema";

export async function listCoverLetters(
  userId: string,
): Promise<CoverLetterRow[]> {
  return db
    .select()
    .from(coverLetters)
    .where(eq(coverLetters.userId, userId))
    .orderBy(desc(coverLetters.updatedAt));
}

export async function getCoverLetterById(
  userId: string,
  id: string,
): Promise<CoverLetterRow | undefined> {
  const [letter] = await db
    .select()
    .from(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)));
  return letter;
}

export async function insertCoverLetter(
  userId: string,
  values: Omit<NewCoverLetterRow, "id" | "userId" | "createdAt" | "updatedAt">,
): Promise<CoverLetterRow> {
  const [letter] = await db
    .insert(coverLetters)
    .values({ userId, ...values })
    .returning();
  return letter;
}

export type CoverLetterPatch = Partial<Pick<NewCoverLetterRow, "paragraphs">>;

export async function updateCoverLetter(
  userId: string,
  id: string,
  patch: CoverLetterPatch,
): Promise<CoverLetterRow | undefined> {
  const [letter] = await db
    .update(coverLetters)
    .set(patch)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .returning();
  return letter;
}

export async function deleteCoverLetter(
  userId: string,
  id: string,
): Promise<void> {
  await db
    .delete(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)));
}
