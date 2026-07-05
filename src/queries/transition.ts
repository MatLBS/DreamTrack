import { db } from "@/db";
import { transitions, type NewTransition, type Transition } from "@/db/schema";

/**
 * Écrit une transition (création ou déplacement d'une carte).
 * `fromColumnId` NULL = événement de création. Appelé par le service à chaque move.
 */
export async function createTransition(
  values: NewTransition,
): Promise<Transition> {
  const [transition] = await db.insert(transitions).values(values).returning();
  return transition;
}
