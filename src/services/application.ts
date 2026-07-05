import type { Application, Column } from "@/db/schema";
import {
  CreateApplicationSchema,
  MoveApplicationSchema,
  UpdateApplicationSchema,
  type CreateApplicationInput,
  type MoveApplicationInput,
  type UpdateApplicationInput,
} from "@/lib/validation/application";
import {
  countApplicationsInColumn,
  getApplicationById,
  getMaxPositionInColumn,
  insertApplicationWithTransition,
  listApplications,
  moveApplication as moveApplicationQuery,
  removeApplicationAndCloseGap,
  updateApplication,
} from "@/queries/application";
import { getColumnById, listColumns } from "@/queries/column";

import { parseInput, ServiceError } from "./errors";

export interface BoardColumn extends Column {
  applications: Application[];
}

/** Colonnes ordonnées avec leurs cartes ordonnées — agrégat pour le Kanban. */
export async function getBoard(): Promise<BoardColumn[]> {
  const [columns, applications] = await Promise.all([
    listColumns(),
    listApplications(),
  ]);

  return columns.map((column) => ({
    ...column,
    applications: applications
      .filter((application) => application.columnId === column.id)
      .sort((a, b) => a.position - b.position),
  }));
}

/** Crée une carte dans la colonne d'entrée (1re colonne) et écrit la transition de création. */
export async function createApplication(
  input: CreateApplicationInput,
): Promise<Application> {
  const values = parseInput(CreateApplicationSchema, input);
  const [entry] = await listColumns();
  if (!entry) {
    throw new ServiceError("CONFLICT", "No columns exist yet");
  }

  const maxPosition = await getMaxPositionInColumn(entry.id);
  const position = (maxPosition ?? -1) + 1;

  return insertApplicationWithTransition({
    ...values,
    columnId: entry.id,
    position,
  });
}

/** Édite les champs de la carte (company/role/url/notes) — pas de transition. */
export async function updateApplicationDetails(
  id: string,
  input: UpdateApplicationInput,
): Promise<Application> {
  const patch = parseInput(UpdateApplicationSchema, input);
  const application = await getApplicationById(id);
  if (!application) {
    throw new ServiceError("NOT_FOUND", `Application ${id} not found`);
  }

  const updated = await updateApplication(id, patch);
  if (!updated) {
    throw new ServiceError("NOT_FOUND", `Application ${id} not found`);
  }
  return updated;
}

/** Déplace une carte (autre colonne ou réordonnancement intra-colonne). */
export async function moveApplication(
  id: string,
  input: MoveApplicationInput,
): Promise<Application> {
  const { toColumnId, toIndex } = parseInput(MoveApplicationSchema, input);

  const application = await getApplicationById(id);
  if (!application) {
    throw new ServiceError("NOT_FOUND", `Application ${id} not found`);
  }

  const targetColumn = await getColumnById(toColumnId);
  if (!targetColumn) {
    throw new ServiceError("NOT_FOUND", `Column ${toColumnId} not found`);
  }

  const targetSize = await countApplicationsInColumn(toColumnId);
  const maxIndex =
    application.columnId === toColumnId ? targetSize - 1 : targetSize;
  const clampedIndex = Math.max(0, Math.min(toIndex, maxIndex));

  return moveApplicationQuery({
    applicationId: id,
    fromColumnId: application.columnId,
    toColumnId,
    fromPosition: application.position,
    toPosition: clampedIndex,
  });
}

export async function deleteApplication(id: string): Promise<void> {
  const application = await getApplicationById(id);
  if (!application) {
    throw new ServiceError("NOT_FOUND", `Application ${id} not found`);
  }

  await removeApplicationAndCloseGap(
    id,
    application.columnId,
    application.position,
  );
}
