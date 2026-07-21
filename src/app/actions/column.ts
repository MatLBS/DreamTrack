"use server";

import { revalidatePath } from "next/cache";

import type { Column } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import type {
  CreateColumnInput,
  RenameColumnInput,
  SetColumnCategoryInput,
} from "@/lib/validation/column";
import {
  createColumn,
  deleteColumn,
  renameColumn,
  setColumnCategory,
} from "@/services/column";

import { runAction, type ActionResult } from "./result";

export async function createColumnAction(
  input: CreateColumnInput,
): Promise<ActionResult<Column>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return createColumn(session.user.id, input);
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function setColumnCategoryAction(
  id: string,
  input: SetColumnCategoryInput,
): Promise<ActionResult<Column>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return setColumnCategory(session.user.id, id, input);
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function renameColumnAction(
  id: string,
  input: RenameColumnInput,
): Promise<ActionResult<Column>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return renameColumn(session.user.id, id, input);
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function deleteColumnAction(
  id: string,
): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const session = await requireAuth();
    return deleteColumn(session.user.id, id);
  });
  if (result.ok) revalidatePath("/");
  return result;
}
