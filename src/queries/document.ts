import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  documents,
  type NewWorkshopDocumentRow,
  type WorkshopDocumentRow,
} from "@/db/schema";

export async function listDocuments(
  userId: string,
): Promise<WorkshopDocumentRow[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentById(
  userId: string,
  id: string,
): Promise<WorkshopDocumentRow | undefined> {
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
  return document;
}

export async function insertDocument(
  userId: string,
  values: Omit<NewWorkshopDocumentRow, "id" | "userId" | "createdAt">,
): Promise<WorkshopDocumentRow> {
  const [document] = await db
    .insert(documents)
    .values({ userId, ...values })
    .returning();
  return document;
}

export async function deleteDocument(
  userId: string,
  id: string,
): Promise<void> {
  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}
