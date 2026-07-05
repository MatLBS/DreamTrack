import { and, asc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
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

export async function createApplication(
  values: NewApplication,
): Promise<Application> {
  const [application] = await db
    .insert(applications)
    .values(values)
    .returning();
  return application;
}

export type ApplicationPatch = Partial<
  Pick<
    NewApplication,
    "company" | "role" | "url" | "notes" | "columnId" | "position"
  >
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

export async function deleteApplication(id: string): Promise<void> {
  await db.delete(applications).where(eq(applications.id, id));
}

/** Décale de `by` les cartes d'une colonne dont `position >= fromPosition`. */
export async function shiftApplicationPositions({
  columnId,
  fromPosition,
  by,
}: {
  columnId: string;
  fromPosition: number;
  by: number;
}): Promise<void> {
  await db
    .update(applications)
    .set({ position: sql`${applications.position} + ${by}` })
    .where(
      and(
        eq(applications.columnId, columnId),
        gte(applications.position, fromPosition),
      ),
    );
}
