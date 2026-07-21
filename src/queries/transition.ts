import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { applications, transitions, type Transition } from "@/db/schema";

/**
 * Toutes les transitions d'un utilisateur, triées par date de création —
 * source de vérité du Sankey. La propriété se dérive par jointure sur
 * `applications.userId` (les transitions n'ont pas de `userId` propre).
 */
export async function listTransitions(userId: string): Promise<Transition[]> {
  const rows = await db
    .select({
      id: transitions.id,
      applicationId: transitions.applicationId,
      fromColumnId: transitions.fromColumnId,
      toColumnId: transitions.toColumnId,
      createdAt: transitions.createdAt,
    })
    .from(transitions)
    .innerJoin(applications, eq(transitions.applicationId, applications.id))
    .where(eq(applications.userId, userId))
    .orderBy(asc(transitions.createdAt));

  return rows;
}
