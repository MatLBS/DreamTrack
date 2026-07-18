import { and, asc, eq, gt, gte, lt, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  transitions,
  type Application,
  type NewApplication,
} from "@/db/schema";

/** Toutes les cartes, triées par position (le service les regroupe par colonne). */
export async function listApplications(): Promise<Application[]> {
  return db.select().from(applications).orderBy(asc(applications.position));
}

export async function getApplicationById(
  id: string,
): Promise<Application | undefined> {
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id));
  return application;
}

/** Plus grande position dans une colonne (`null` si vide) — pour ajouter en fin de colonne. */
export async function getMaxPositionInColumn(
  columnId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${applications.position})` })
    .from(applications)
    .where(eq(applications.columnId, columnId));
  return row?.max ?? null;
}

/** Nombre de cartes dans une colonne — utilisé par le guard de suppression de colonne. */
export async function countApplicationsInColumn(
  columnId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(eq(applications.columnId, columnId));
  return row?.count ?? 0;
}

export type ApplicationPatch = Partial<
  Pick<NewApplication, "company" | "role" | "url" | "notes" | "iconUrl">
>;

export async function updateApplication(
  id: string,
  patch: ApplicationPatch,
): Promise<Application | undefined> {
  const [application] = await db
    .update(applications)
    .set(patch)
    .where(eq(applications.id, id))
    .returning();
  return application;
}

/**
 * Crée une carte et écrit l'événement de création (`fromColumnId = null`)
 * dans le même mouvement. Atomique.
 */
export async function insertApplicationWithTransition({
  company,
  role,
  url,
  notes,
  iconUrl,
  columnId,
  position,
}: {
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
      .values({ company, role, url, notes, iconUrl, columnId, position })
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
 * Déplace une carte : referme le trou dans l'ancienne colonne, ouvre le slot
 * dans la nouvelle (ou décale la plage intra-colonne en cas de réordonnancement),
 * met à jour la carte, et écrit la transition uniquement si la colonne change.
 * Atomique.
 */
export async function moveApplication({
  applicationId,
  fromColumnId,
  toColumnId,
  fromPosition,
  toPosition,
}: {
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
            eq(applications.columnId, fromColumnId),
            gt(applications.position, fromPosition),
          ),
        );

      await tx
        .update(applications)
        .set({ position: sql`${applications.position} + 1` })
        .where(
          and(
            eq(applications.columnId, toColumnId),
            gte(applications.position, toPosition),
          ),
        );
    }

    const [application] = await tx
      .update(applications)
      .set({ columnId: toColumnId, position: toPosition })
      .where(eq(applications.id, applicationId))
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
 * Supprime une carte (le cascade supprime ses transitions) et referme le trou
 * dans sa colonne. Atomique.
 */
export async function removeApplicationAndCloseGap(
  id: string,
  columnId: string,
  position: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(applications).where(eq(applications.id, id));

    await tx
      .update(applications)
      .set({ position: sql`${applications.position} - 1` })
      .where(
        and(
          eq(applications.columnId, columnId),
          gt(applications.position, position),
        ),
      );
  });
}
