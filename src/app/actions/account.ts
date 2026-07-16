"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/auth-guard";
import { UpdateAccountSchema } from "@/lib/validation/account";
import { parseInput, ServiceError } from "@/services/errors";

import { runAction, type ActionResult } from "./result";

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

async function saveAvatar(file: File): Promise<string> {
  const extension = ALLOWED_AVATAR_TYPES[file.type];
  if (!extension) {
    throw new ServiceError("UNSUPPORTED_IMAGE_TYPE", "Unsupported image type");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new ServiceError("IMAGE_TOO_LARGE", "Image is too large (max 3MB)");
  }

  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/avatars/${filename}`;
}

/** Met à jour le nom et, si fourni, la photo de profil (upload local) de l'utilisateur connecté. */
export async function updateAccountAction(
  formData: FormData,
): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    await requireAuth();

    const { name } = parseInput(UpdateAccountSchema, {
      name: formData.get("name"),
    });

    const avatar = formData.get("avatar");
    const image =
      avatar instanceof File && avatar.size > 0
        ? await saveAvatar(avatar)
        : undefined;

    await auth.api.updateUser({
      body: { name, ...(image ? { image } : {}) },
      headers: await headers(),
    });
  });
  if (result.ok) revalidatePath("/profile");
  return result;
}
