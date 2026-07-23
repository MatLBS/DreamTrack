import { differenceInDays } from "date-fns";

import type { Application, Column, Transition } from "@/db/schema";
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
import { getLastTransitionPerApplication } from "@/queries/transition";
import { deleteApplicationIcon } from "@/lib/uploads/application-icon";

import { ensureDefaultColumns } from "./column";
import { parseInput, ServiceError } from "./errors";

interface ApplicationWithDuration extends Application {
  daysInCurrentStep: number;
}

export interface BoardColumn extends Column {
  applications: ApplicationWithDuration[];
}

/** Colonnes ordonnées avec leurs cartes ordonnées — agrégat pour le Kanban. */
export async function getBoard(userId: string): Promise<BoardColumn[]> {
  // Filet pour les comptes créés avant le hook de seed à l'inscription — no-op
  // dès qu'une colonne existe déjà pour cet utilisateur.
  await ensureDefaultColumns(userId);

  const [columns, applications, lastTransitions] = await Promise.all([
    listColumns(userId),
    listApplications(userId),
    getLastTransitionPerApplication(userId),
  ]);

  const now = new Date();

  return columns.map((column) => ({
    ...column,
    applications: applications
      .filter((application) => application.columnId === column.id)
      .sort((a, b) => a.position - b.position)
      .map((app) => ({
        ...app,
        daysInCurrentStep: calculateDaysInStep(app, lastTransitions, now),
      })),
  }));
}

/**
 * Crée une carte — dans `columnId` si fourni (et valide), sinon dans la colonne
 * d'entrée (1re colonne) — et écrit la transition de création.
 */
export async function createApplication(
  userId: string,
  input: CreateApplicationInput,
): Promise<Application> {
  const { columnId, ...values } = parseInput(CreateApplicationSchema, input);

  let targetColumnId = columnId;
  if (targetColumnId) {
    const column = await getColumnById(userId, targetColumnId);
    if (!column) {
      throw new ServiceError(
        "COLUMN_NOT_FOUND",
        `Column ${targetColumnId} not found`,
      );
    }
  } else {
    const [entry] = await listColumns(userId);
    if (!entry) {
      throw new ServiceError("NO_COLUMNS", "No columns exist yet");
    }
    targetColumnId = entry.id;
  }

  const maxPosition = await getMaxPositionInColumn(userId, targetColumnId);
  const position = (maxPosition ?? -1) + 1;

  return insertApplicationWithTransition({
    userId,
    ...values,
    columnId: targetColumnId,
    position,
  });
}

/** Édite les champs de la carte (company/role/url/notes) — pas de transition. */
export async function updateApplicationDetails(
  userId: string,
  id: string,
  input: UpdateApplicationInput,
): Promise<Application> {
  const patch = parseInput(UpdateApplicationSchema, input);
  const application = await getApplicationById(userId, id);
  if (!application) {
    throw new ServiceError(
      "APPLICATION_NOT_FOUND",
      `Application ${id} not found`,
    );
  }

  const updated = await updateApplication(userId, id, patch);
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
  userId: string,
  id: string,
  input: MoveApplicationInput,
): Promise<Application> {
  const { toColumnId, toIndex } = parseInput(MoveApplicationSchema, input);

  const application = await getApplicationById(userId, id);
  if (!application) {
    throw new ServiceError(
      "APPLICATION_NOT_FOUND",
      `Application ${id} not found`,
    );
  }

  const targetColumn = await getColumnById(userId, toColumnId);
  if (!targetColumn) {
    throw new ServiceError(
      "COLUMN_NOT_FOUND",
      `Column ${toColumnId} not found`,
    );
  }

  const targetSize = await countApplicationsInColumn(userId, toColumnId);
  const maxIndex =
    application.columnId === toColumnId ? targetSize - 1 : targetSize;
  const clampedIndex = Math.max(0, Math.min(toIndex, maxIndex));

  return moveApplicationQuery({
    userId,
    applicationId: id,
    fromColumnId: application.columnId,
    toColumnId,
    fromPosition: application.position,
    toPosition: clampedIndex,
  });
}

/** Bascule le statut prioritaire (étoile) d'une carte — pas de transition. */
export async function setApplicationFavorite(
  userId: string,
  id: string,
  input: SetApplicationFavoriteInput,
): Promise<Application> {
  const { isFavorite } = parseInput(SetApplicationFavoriteSchema, input);

  const updated = await updateApplication(userId, id, { isFavorite });
  if (!updated) {
    throw new ServiceError(
      "APPLICATION_NOT_FOUND",
      `Application ${id} not found`,
    );
  }
  return updated;
}

/** Statistiques agrégées (candidatures, taux de réponse, en attente, offres). */
export async function getApplicationStats(
  userId: string,
): Promise<ApplicationStats> {
  const [columns, applications] = await Promise.all([
    listColumns(userId),
    listApplications(userId),
  ]);

  return aggregateStats(columns, applications);
}

export async function deleteApplication(
  userId: string,
  id: string,
): Promise<void> {
  const application = await getApplicationById(userId, id);
  if (!application) {
    throw new ServiceError(
      "APPLICATION_NOT_FOUND",
      `Application ${id} not found`,
    );
  }

  await removeApplicationAndCloseGap(
    userId,
    id,
    application.columnId,
    application.position,
  );

  await deleteApplicationIcon(application.iconUrl);
}

/**
 * Calcule le nombre de jours depuis que la carte est dans sa colonne actuelle.
 * Utilise la dernière transition si disponible, sinon la date de création.
 */
function calculateDaysInStep(
  application: Application,
  transitionsMap: Map<string, Transition>,
  now: Date,
): number {
  const lastTransition = transitionsMap.get(application.id);

  // Fallback : si aucune transition trouvée, utiliser la date de création
  const referenceDate = lastTransition
    ? lastTransition.createdAt
    : application.createdAt;

  return differenceInDays(now, referenceDate);
}
