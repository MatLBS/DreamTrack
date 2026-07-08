import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles, type NewProfile, type Profile } from "@/db/schema";

export async function getProfileByUserId(
  userId: string,
): Promise<Profile | undefined> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId));
  return profile;
}

export type ProfilePatch = Partial<
  Pick<NewProfile, "desiredPositions" | "locations" | "salaryMin" | "salaryMax">
>;

/** Crée ou met à jour la ligne de préférences de l'utilisateur (une ligne par user). */
export async function upsertProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<Profile> {
  const [profile] = await db
    .insert(profiles)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: profiles.userId, set: patch })
    .returning();
  return profile;
}
