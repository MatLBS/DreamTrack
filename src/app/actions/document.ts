"use server";

import { revalidatePath } from "next/cache";

import type { WorkshopDocumentRow } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import type { DocumentKind } from "@/lib/validation/document";
import {
  listUserDocuments,
  removeDocument,
  uploadDocument,
} from "@/services/document";

import { ServiceError } from "@/services/errors";
import { runAction, type ActionResult } from "./result";

function requiredStringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function uploadDocumentAction(
  formData: FormData,
): Promise<ActionResult<WorkshopDocumentRow>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ServiceError("VALIDATION", "Missing file");
    }
    return uploadDocument(session.user.id, {
      file,
      kind: requiredStringField(formData, "kind") as DocumentKind,
      title: requiredStringField(formData, "title"),
    });
  });
  if (result.ok) revalidatePath("/workshop");
  return result;
}

export async function listDocumentsAction(): Promise<
  ActionResult<WorkshopDocumentRow[]>
> {
  return runAction(async () => {
    const session = await requireAuth();
    return listUserDocuments(session.user.id);
  });
}

export async function deleteDocumentAction(
  id: string,
): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return removeDocument(session.user.id, id);
  });
  if (result.ok) revalidatePath("/workshop");
  return result;
}
