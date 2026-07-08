"use server";

import { revalidatePath } from "next/cache";

import type { Profile } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import type { UpdateProfileInput } from "@/lib/validation/profile";
import { updateProfile } from "@/services/profile";

import { runAction, type ActionResult } from "./result";

export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<ActionResult<Profile>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return updateProfile(session.user.id, input);
  });
  if (result.ok) revalidatePath("/profile");
  return result;
}
