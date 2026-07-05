import { and, asc, eq, gt, gte, lt, lte, sql } from "drizzle-orm";

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

/** Insert simple en masse — utilisé uniquement par le seed (table vide, aucun décalage requis). */
export async function insertColumns(values: NewColumn[]): Promise<Column[]> {
  return db.insert(columns).values(values).returning();
}

/**
 * Insère une nouvelle colonne à `position` : décale les colonnes existantes
 * (>= position) de +1, puis insère la nouvelle à ce slot. Atomique.
 */
export async function insertColumnAt({
  name,
  position,
  isDefault,
}: {
  name: string;
  position: number;
  isDefault: boolean;
}): Promise<Column> {
  return db.transaction(async (tx) => {
    await tx
      .update(columns)
      .set({ position: sql`${columns.position} + 1` })
      .where(gte(columns.position, position));

    const [column] = await tx
      .insert(columns)
      .values({ name, position, isDefault })
      .returning();
    return column;
  });
}

/**
 * Déplace une colonne de `fromPosition` vers `toPosition`, en décalant les
 * colonnes intermédiaires pour combler/ouvrir le slot. Atomique.
 */
export async function moveColumnToPosition(
  id: string,
  fromPosition: number,
  toPosition: number,
): Promise<Column> {
  return db.transaction(async (tx) => {
    if (toPosition > fromPosition) {
      await tx
        .update(columns)
        .set({ position: sql`${columns.position} - 1` })
        .where(
          and(
            gt(columns.position, fromPosition),
            lte(columns.position, toPosition),
          ),
        );
    } else if (toPosition < fromPosition) {
      await tx
        .update(columns)
        .set({ position: sql`${columns.position} + 1` })
        .where(
          and(
            gte(columns.position, toPosition),
            lt(columns.position, fromPosition),
          ),
        );
    }

    const [column] = await tx
      .update(columns)
      .set({ position: toPosition })
      .where(eq(columns.id, id))
      .returning();
    return column;
  });
}

/**
 * Supprime une colonne et referme le trou (décale de -1 les colonnes situées
 * après elle). Atomique.
 */
export async function removeColumnAndCloseGap(
  id: string,
  position: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(columns).where(eq(columns.id, id));

    await tx
      .update(columns)
      .set({ position: sql`${columns.position} - 1` })
      .where(gt(columns.position, position));
  });
}
