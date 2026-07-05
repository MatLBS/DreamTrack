"use server";

import { revalidatePath } from "next/cache";

import type { Application } from "@/db/schema";
import type {
  CreateApplicationInput,
  MoveApplicationInput,
  UpdateApplicationInput,
} from "@/lib/validation/application";
import {
  createApplication,
  deleteApplication,
  moveApplication,
  updateApplicationDetails,
} from "@/services/application";

import { runAction, type ActionResult } from "./result";

export async function createApplicationAction(
  input: CreateApplicationInput,
): Promise<ActionResult<Application>> {
  const result = await runAction(() => createApplication(input));
  if (result.ok) revalidatePath("/");
  return result;
}

export async function updateApplicationAction(
  id: string,
  input: UpdateApplicationInput,
): Promise<ActionResult<Application>> {
  const result = await runAction(() => updateApplicationDetails(id, input));
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

export async function deleteApplicationAction(
  id: string,
): Promise<ActionResult<void>> {
  const result = await runAction(() => deleteApplication(id));
  if (result.ok) revalidatePath("/");
  return result;
}
