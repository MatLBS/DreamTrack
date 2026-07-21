"use server";

import { revalidatePath } from "next/cache";

import type { Application } from "@/db/schema";
import { saveApplicationIcon } from "@/lib/uploads/application-icon";
import type {
  MoveApplicationInput,
  SetApplicationFavoriteInput,
} from "@/lib/validation/application";
import {
  createApplication,
  deleteApplication,
  moveApplication,
  setApplicationFavorite,
  updateApplicationDetails,
} from "@/services/application";

import { runAction, type ActionResult } from "./result";

function requiredStringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringField(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Résout le champ icône d'un `FormData` de formulaire application : un fichier
 * remplace l'icône (upload + sanitisation), `removeIcon=1` la retire, sinon le
 * champ est omis pour ne pas toucher la valeur existante (voir
 * `updateApplicationDetails`, qui distingue « absent » de « envoyé à null »).
 */
async function resolveIconPatch(
  formData: FormData,
): Promise<{ iconUrl?: string | null }> {
  const icon = formData.get("icon");
  if (icon instanceof File && icon.size > 0) {
    return { iconUrl: await saveApplicationIcon(icon) };
  }
  if (formData.get("removeIcon") === "1") {
    return { iconUrl: null };
  }
  return {};
}

export async function createApplicationAction(
  formData: FormData,
): Promise<ActionResult<Application>> {
  const result = await runAction(async () => {
    const iconPatch = await resolveIconPatch(formData);
    const columnId = optionalStringField(formData, "columnId");
    return createApplication({
      company: requiredStringField(formData, "company"),
      role: requiredStringField(formData, "role"),
      url: optionalStringField(formData, "url"),
      notes: optionalStringField(formData, "notes"),
      ...(columnId ? { columnId } : {}),
      ...iconPatch,
    });
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function updateApplicationAction(
  id: string,
  formData: FormData,
): Promise<ActionResult<Application>> {
  const result = await runAction(async () => {
    const iconPatch = await resolveIconPatch(formData);
    return updateApplicationDetails(id, {
      company: requiredStringField(formData, "company"),
      role: requiredStringField(formData, "role"),
      url: optionalStringField(formData, "url"),
      notes: optionalStringField(formData, "notes"),
      ...iconPatch,
    });
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function moveApplicationAction(
  id: string,
  input: MoveApplicationInput,
): Promise<ActionResult<Application>> {
  const result = await runAction(() => moveApplication(id, input));
  if (result.ok) revalidatePath("/");
  return result;
}

export async function setApplicationFavoriteAction(
  id: string,
  input: SetApplicationFavoriteInput,
): Promise<ActionResult<Application>> {
  const result = await runAction(() => setApplicationFavorite(id, input));
  if (result.ok) revalidatePath("/");
  return result;
}

export async function deleteApplicationAction(
  id: string,
): Promise<ActionResult<void>> {
  const result = await runAction(() => deleteApplication(id));
  if (result.ok) revalidatePath("/");
  return result;
}
