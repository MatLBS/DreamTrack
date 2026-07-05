import { asc } from "drizzle-orm";

import { db } from "@/db";
import { transitions, type Transition } from "@/db/schema";

/** Toutes les transitions, triées par date de création — source de vérité du Sankey. */
export async function listTransitions(): Promise<Transition[]> {
  return db.select().from(transitions).orderBy(asc(transitions.createdAt));
}
