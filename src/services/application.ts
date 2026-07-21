import type { Application, Column } from "@/db/schema";
import {
  CreateApplicationSchema,
  MoveApplicationSchema,
  SetApplicationFavoriteSchema,
  UpdateApplicationSchema,
  type CreateApplicationInput,
  type MoveApplicationInput,
  type SetApplicationFavoriteInput,
  type UpdateApplicationInput,
} from "@/lib/validation/application";
import { aggregateStats, type ApplicationStats } from "@/lib/stats/aggregate";
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
import { deleteApplicationIcon } from "@/lib/uploads/application-icon";

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

/**
 * Crée une carte — dans `columnId` si fourni (et valide), sinon dans la colonne
 * d'entrée (1re colonne) — et écrit la transition de création.
 */
export async function createApplication(
  input: CreateApplicationInput,
): Promise<Application> {
  const { columnId, ...values } = parseInput(CreateApplicationSchema, input);

  let targetColumnId = columnId;
  if (targetColumnId) {
    const column = await getColumnById(targetColumnId);
    if (!column) {
      throw new ServiceError(
        "COLUMN_NOT_FOUND",
        `Column ${targetColumnId} not found`,
      );
    }
  } else {
    const [entry] = await listColumns();
    if (!entry) {
      throw new ServiceError("NO_COLUMNS", "No columns exist yet");
    }
    targetColumnId = entry.id;
  }

  const maxPosition = await getMaxPositionInColumn(targetColumnId);
  const position = (maxPosition ?? -1) + 1;

  return insertApplicationWithTransition({
    ...values,
    columnId: targetColumnId,
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
    throw new ServiceError(
      "APPLICATION_NOT_FOUND",
      `Application ${id} not found`,
    );
  }

  const updated = await updateApplication(id, patch);
  if (!updated) {
    throw new ServiceError(
      "APPLICATION_NOT_FOUND",
      `Application ${id} not found`,
    );
  }

  // "iconUrl" in patch : le champ n'est présent que si l'appelant l'a
  // explicitement envoyé (remplacement ou retrait à null) — un simple test
  // sur la valeur ne distinguerait pas ça d'un champ non touché.
  if ("iconUrl" in patch && patch.iconUrl !== application.iconUrl) {
    await deleteApplicationIcon(application.iconUrl);
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
    throw new ServiceError(
      "APPLICATION_NOT_FOUND",
      `Application ${id} not found`,
    );
  }

  const targetColumn = await getColumnById(toColumnId);
  if (!targetColumn) {
    throw new ServiceError(
      "COLUMN_NOT_FOUND",
      `Column ${toColumnId} not found`,
    );
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

/** Bascule le statut prioritaire (étoile) d'une carte — pas de transition. */
export async function setApplicationFavorite(
  id: string,
  input: SetApplicationFavoriteInput,
): Promise<Application> {
  const { isFavorite } = parseInput(SetApplicationFavoriteSchema, input);

  const updated = await updateApplication(id, { isFavorite });
  if (!updated) {
    throw new ServiceError(
      "APPLICATION_NOT_FOUND",
      `Application ${id} not found`,
    );
  }
  return updated;
}

/** Statistiques agrégées (candidatures, taux de réponse, en attente, offres). */
export async function getApplicationStats(): Promise<ApplicationStats> {
  const [columns, applications] = await Promise.all([
    listColumns(),
    listApplications(),
  ]);

  return aggregateStats(columns, applications);
}

export async function deleteApplication(id: string): Promise<void> {
  const application = await getApplicationById(id);
  if (!application) {
    throw new ServiceError(
      "APPLICATION_NOT_FOUND",
      `Application ${id} not found`,
    );
  }

  await removeApplicationAndCloseGap(
    id,
    application.columnId,
    application.position,
  );

  await deleteApplicationIcon(application.iconUrl);
}
