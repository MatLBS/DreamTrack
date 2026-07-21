import { and, asc, eq, gt, gte, lt, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  transitions,
  type Application,
  type NewApplication,
} from "@/db/schema";

/** Toutes les cartes d'un utilisateur, triées par position (le service les regroupe par colonne). */
export async function listApplications(userId: string): Promise<Application[]> {
  return db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(asc(applications.position));
}

export async function getApplicationById(
  userId: string,
  id: string,
): Promise<Application | undefined> {
  const [application] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));
  return application;
}

/** Plus grande position dans une colonne (`null` si vide) — pour ajouter en fin de colonne. */
export async function getMaxPositionInColumn(
  userId: string,
  columnId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${applications.position})` })
    .from(applications)
    .where(
      and(eq(applications.userId, userId), eq(applications.columnId, columnId)),
    );
  return row?.max ?? null;
}

/** Nombre de cartes dans une colonne — utilisé par le guard de suppression de colonne. */
export async function countApplicationsInColumn(
  userId: string,
  columnId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(
      and(eq(applications.userId, userId), eq(applications.columnId, columnId)),
    );
  return row?.count ?? 0;
}

export type ApplicationPatch = Partial<
  Pick<
    NewApplication,
    "company" | "role" | "url" | "notes" | "iconUrl" | "isFavorite"
  >
>;

export async function updateApplication(
  userId: string,
  id: string,
  patch: ApplicationPatch,
): Promise<Application | undefined> {
  const [application] = await db
    .update(applications)
    .set(patch)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning();
  return application;
}

/**
 * Crée une carte pour cet utilisateur et écrit l'événement de création
 * (`fromColumnId = null`) dans le même mouvement. Atomique.
 */
export async function insertApplicationWithTransition({
  userId,
  company,
  role,
  url,
  notes,
  iconUrl,
  columnId,
  position,
}: {
  userId: string;
  company: string;
  role: string;
  url?: string | null;
  notes?: string | null;
  iconUrl?: string | null;
  columnId: string;
  position: number;
}): Promise<Application> {
  return db.transaction(async (tx) => {
    const [application] = await tx
      .insert(applications)
      .values({
        userId,
        company,
        role,
        url,
        notes,
        iconUrl,
        columnId,
        position,
      })
      .returning();

    await tx.insert(transitions).values({
      applicationId: application.id,
      fromColumnId: null,
      toColumnId: columnId,
    });

    return application;
  });
}

/**
 * Déplace une carte de cet utilisateur : referme le trou dans l'ancienne
 * colonne, ouvre le slot dans la nouvelle (ou décale la plage intra-colonne
 * en cas de réordonnancement), met à jour la carte, et écrit la transition
 * uniquement si la colonne change. Atomique.
 */
export async function moveApplication({
  userId,
  applicationId,
  fromColumnId,
  toColumnId,
  fromPosition,
  toPosition,
}: {
  userId: string;
  applicationId: string;
  fromColumnId: string;
  toColumnId: string;
  fromPosition: number;
  toPosition: number;
}): Promise<Application> {
  return db.transaction(async (tx) => {
    if (fromColumnId === toColumnId) {
      if (toPosition > fromPosition) {
        await tx
          .update(applications)
          .set({ position: sql`${applications.position} - 1` })
          .where(
            and(
              eq(applications.userId, userId),
              eq(applications.columnId, fromColumnId),
              gt(applications.position, fromPosition),
              lte(applications.position, toPosition),
            ),
          );
      } else if (toPosition < fromPosition) {
        await tx
          .update(applications)
          .set({ position: sql`${applications.position} + 1` })
          .where(
            and(
              eq(applications.userId, userId),
              eq(applications.columnId, fromColumnId),
              gte(applications.position, toPosition),
              lt(applications.position, fromPosition),
            ),
          );
      }
    } else {
      await tx
        .update(applications)
        .set({ position: sql`${applications.position} - 1` })
        .where(
          and(
            eq(applications.userId, userId),
            eq(applications.columnId, fromColumnId),
            gt(applications.position, fromPosition),
          ),
        );

      await tx
        .update(applications)
        .set({ position: sql`${applications.position} + 1` })
        .where(
          and(
            eq(applications.userId, userId),
            eq(applications.columnId, toColumnId),
            gte(applications.position, toPosition),
          ),
        );
    }

    const [application] = await tx
      .update(applications)
      .set({ columnId: toColumnId, position: toPosition })
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.userId, userId),
        ),
      )
      .returning();

    if (fromColumnId !== toColumnId) {
      await tx.insert(transitions).values({
        applicationId,
        fromColumnId,
        toColumnId,
      });
    }

    return application;
  });
}

/**
 * Supprime une carte de cet utilisateur (le cascade supprime ses transitions)
 * et referme le trou dans sa colonne. Atomique.
 */
export async function removeApplicationAndCloseGap(
  userId: string,
  id: string,
  columnId: string,
  position: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)));

    await tx
      .update(applications)
      .set({ position: sql`${applications.position} - 1` })
      .where(
        and(
          eq(applications.userId, userId),
          eq(applications.columnId, columnId),
          gt(applications.position, position),
        ),
      );
  });
}
