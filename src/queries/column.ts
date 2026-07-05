import { asc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { columns, type Column, type NewColumn } from "@/db/schema";

/** Toutes les colonnes, triées par ordre d'affichage. */
export async function listColumns(): Promise<Column[]> {
  return db.select().from(columns).orderBy(asc(columns.position));
}

export async function getColumnById(id: string): Promise<Column | undefined> {
  const [column] = await db.select().from(columns).where(eq(columns.id, id));
  return column;
}

export async function createColumn(values: NewColumn): Promise<Column> {
  const [column] = await db.insert(columns).values(values).returning();
  return column;
}

export type ColumnPatch = Partial<Pick<NewColumn, "name" | "position">>;

export async function updateColumn(
  id: string,
  patch: ColumnPatch,
): Promise<Column | undefined> {
  const [column] = await db
    .update(columns)
    .set(patch)
    .where(eq(columns.id, id))
    .returning();
  return column;
}

export async function deleteColumn(id: string): Promise<void> {
  await db.delete(columns).where(eq(columns.id, id));
}

/** Décale de `by` toutes les colonnes dont `position >= fromPosition` (ouvre/referme un slot). */
export async function shiftColumnPositions({
  fromPosition,
  by,
}: {
  fromPosition: number;
  by: number;
}): Promise<void> {
  await db
    .update(columns)
    .set({ position: sql`${columns.position} + ${by}` })
    .where(gte(columns.position, fromPosition));
}
