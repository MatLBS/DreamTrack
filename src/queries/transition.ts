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

/**
 * Récupère la dernière transition de chaque candidature pour un utilisateur.
 * Utilisé pour calculer la durée dans l'étape courante.
 * Retourne une Map pour lookup O(1) dans la couche service.
 */
export async function getLastTransitionPerApplication(
  userId: string,
): Promise<Map<string, Transition>> {
  const allTransitions = await listTransitions(userId);

  // Réduire pour garder seulement la dernière transition par applicationId
  const lastTransitionsMap = new Map<string, Transition>();

  for (const transition of allTransitions) {
    const existing = lastTransitionsMap.get(transition.applicationId);

    // Garder la transition la plus récente
    if (
      !existing ||
      transition.createdAt.getTime() > existing.createdAt.getTime()
    ) {
      lastTransitionsMap.set(transition.applicationId, transition);
    }
  }

  return lastTransitionsMap;
}
