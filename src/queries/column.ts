import { and, asc, eq, gt, gte, lt, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { columns, type Column, type NewColumn } from "@/db/schema";

/** Toutes les colonnes d'un utilisateur, triées par ordre d'affichage. */
export async function listColumns(userId: string): Promise<Column[]> {
  return db
    .select()
    .from(columns)
    .where(eq(columns.userId, userId))
    .orderBy(asc(columns.position));
}

export async function getColumnById(
  userId: string,
  id: string,
): Promise<Column | undefined> {
  const [column] = await db
    .select()
    .from(columns)
    .where(and(eq(columns.id, id), eq(columns.userId, userId)));
  return column;
}

export type ColumnPatch = Partial<
  Pick<NewColumn, "name" | "position" | "isLostStage">
>;

export async function updateColumn(
  userId: string,
  id: string,
  patch: ColumnPatch,
): Promise<Column | undefined> {
  const [column] = await db
    .update(columns)
    .set(patch)
    .where(and(eq(columns.id, id), eq(columns.userId, userId)))
    .returning();
  return column;
}

/** Insert simple en masse — utilisé uniquement par le seed (aucune colonne existante pour cet utilisateur, aucun décalage requis). */
export async function insertColumns(values: NewColumn[]): Promise<Column[]> {
  return db.insert(columns).values(values).returning();
}

/**
 * Insère une nouvelle colonne à `position` pour cet utilisateur : décale ses
 * colonnes existantes (>= position) de +1, puis insère la nouvelle à ce slot.
 * Atomique.
 */
export async function insertColumnAt({
  userId,
  name,
  position,
  isDefault,
  isLostStage,
}: {
  userId: string;
  name: string;
  position: number;
  isDefault: boolean;
  isLostStage: boolean;
}): Promise<Column> {
  return db.transaction(async (tx) => {
    await tx
      .update(columns)
      .set({ position: sql`${columns.position} + 1` })
      .where(and(eq(columns.userId, userId), gte(columns.position, position)));

    const [column] = await tx
      .insert(columns)
      .values({ userId, name, position, isDefault, isLostStage })
      .returning();
    return column;
  });
}

/**
 * Déplace une colonne de `fromPosition` vers `toPosition` pour cet
 * utilisateur, en décalant les colonnes intermédiaires pour combler/ouvrir
 * le slot. Atomique.
 */
export async function moveColumnToPosition(
  userId: string,
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
            eq(columns.userId, userId),
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
            eq(columns.userId, userId),
            gte(columns.position, toPosition),
            lt(columns.position, fromPosition),
          ),
        );
    }

    const [column] = await tx
      .update(columns)
      .set({ position: toPosition })
      .where(and(eq(columns.id, id), eq(columns.userId, userId)))
      .returning();
    return column;
  });
}

/**
 * Supprime une colonne de cet utilisateur et referme le trou (décale de -1
 * les colonnes situées après elle). Atomique.
 */
export async function removeColumnAndCloseGap(
  userId: string,
  id: string,
  position: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(columns)
      .where(and(eq(columns.id, id), eq(columns.userId, userId)));

    await tx
      .update(columns)
      .set({ position: sql`${columns.position} - 1` })
      .where(and(eq(columns.userId, userId), gt(columns.position, position)));
  });
}
