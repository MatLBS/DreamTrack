import type { Profile } from "@/db/schema";
import {
  UpdateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validation/profile";
import { getProfileByUserId, upsertProfile } from "@/queries/profile";

import { parseInput } from "./errors";

export async function getProfile(userId: string): Promise<Profile | null> {
  const profile = await getProfileByUserId(userId);
  return profile ?? null;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<Profile> {
  const patch = parseInput(UpdateProfileSchema, input);
  return upsertProfile(userId, patch);
}
