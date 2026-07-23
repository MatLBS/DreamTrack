import { and, desc, eq, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  aiWatchConfigs,
  jobOffers,
  type AiWatchConfig,
  type JobOffer,
  type NewAiWatchConfig,
  type NewJobOffer,
} from "@/db/schema";

export async function getConfigByUserId(
  userId: string,
): Promise<AiWatchConfig | undefined> {
  const [config] = await db
    .select()
    .from(aiWatchConfigs)
    .where(eq(aiWatchConfigs.userId, userId));
  return config;
}

export type AiWatchConfigPatch = Partial<
  Pick<NewAiWatchConfig, "enabled" | "intervalMinutes">
>;

/** Crée ou met à jour la configuration de veille de l'utilisateur (une ligne par user). */
export async function upsertConfig(
  userId: string,
  patch: AiWatchConfigPatch,
): Promise<AiWatchConfig> {
  const [config] = await db
    .insert(aiWatchConfigs)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: aiWatchConfigs.userId, set: patch })
    .returning();
  return config;
}

/**
 * Configurations actives dont l'intervalle est écoulé (ou jamais lancées).
 * `now` est un paramètre explicite pour rester testable sans horloge système.
 */
export async function listDueConfigs(now: Date): Promise<AiWatchConfig[]> {
  return db
    .select()
    .from(aiWatchConfigs)
    .where(
      and(
        eq(aiWatchConfigs.enabled, true),
        or(
          sql`${aiWatchConfigs.lastRunAt} IS NULL`,
          lte(
            aiWatchConfigs.lastRunAt,
            sql`${now.getTime()} - ${aiWatchConfigs.intervalMinutes} * 60000`,
          ),
        ),
      ),
    );
}

export async function markRunFinished(
  userId: string,
  status: "success" | "error",
  error: string | null,
): Promise<void> {
  await db
    .update(aiWatchConfigs)
    .set({ lastRunAt: new Date(), lastRunStatus: status, lastRunError: error })
    .where(eq(aiWatchConfigs.userId, userId));
}

export type NewOfferInput = Omit<NewJobOffer, "id" | "userId" | "dismissed" | "discoveredAt">;

/** Insère les offres découvertes ; ignore silencieusement les doublons (user, source, externalId). */
export async function insertOffers(
  userId: string,
  offers: NewOfferInput[],
): Promise<void> {
  if (offers.length === 0) return;
  await db
    .insert(jobOffers)
    .values(offers.map((offer) => ({ ...offer, userId })))
    .onConflictDoNothing();
}

export async function listOffersByUserId(userId: string): Promise<JobOffer[]> {
  return db
    .select()
    .from(jobOffers)
    .where(
      and(
        eq(jobOffers.userId, userId),
        eq(jobOffers.dismissed, false),
        sql`${jobOffers.matchScore} >= 40`,
      ),
    )
    .orderBy(desc(jobOffers.matchScore));
}

export async function getOfferById(id: string): Promise<JobOffer | undefined> {
  const [offer] = await db.select().from(jobOffers).where(eq(jobOffers.id, id));
  return offer;
}

export async function dismissOffer(id: string): Promise<void> {
  await db.update(jobOffers).set({ dismissed: true }).where(eq(jobOffers.id, id));
}
