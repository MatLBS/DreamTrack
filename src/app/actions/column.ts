"use server";

import { revalidatePath } from "next/cache";

import type { Column } from "@/db/schema";
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
  const result = await runAction(() => createColumn(input));
  if (result.ok) revalidatePath("/");
  return result;
}

export async function setColumnCategoryAction(
  id: string,
  input: SetColumnCategoryInput,
): Promise<ActionResult<Column>> {
  const result = await runAction(() => setColumnCategory(id, input));
  if (result.ok) revalidatePath("/");
  return result;
}

export async function renameColumnAction(
  id: string,
  input: RenameColumnInput,
): Promise<ActionResult<Column>> {
  const result = await runAction(() => renameColumn(id, input));
  if (result.ok) revalidatePath("/");
  return result;
}

export async function deleteColumnAction(
  id: string,
): Promise<ActionResult<void>> {
  const result = await runAction(() => deleteColumn(id));
  if (result.ok) revalidatePath("/");
  return result;
}
