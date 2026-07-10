import type { Column } from "@/db/schema";
import {
  CreateColumnSchema,
  RenameColumnSchema,
  ReorderColumnSchema,
  SetColumnCategorySchema,
  type CreateColumnInput,
  type RenameColumnInput,
  type ReorderColumnInput,
  type SetColumnCategoryInput,
} from "@/lib/validation/column";
import { countApplicationsInColumn } from "@/queries/application";
import {
  getColumnById,
  insertColumnAt,
  insertColumns,
  listColumns,
  moveColumnToPosition,
  removeColumnAndCloseGap,
  updateColumn,
} from "@/queries/column";

import { parseInput, ServiceError } from "./errors";

/** Nombre de colonnes fixes en sortie (Accepted, Rejected) — jamais déplaçables. */
const TERMINAL_COUNT = 2;

const DEFAULT_COLUMNS = [
  { name: "Jobs applied to", isLostStage: false, isNoReplyStage: false },
  { name: "Replies", isLostStage: false, isNoReplyStage: false },
  { name: "Rejections", isLostStage: true, isNoReplyStage: false },
  { name: "No reply", isLostStage: true, isNoReplyStage: true },
  { name: "Accepted", isLostStage: false, isNoReplyStage: false },
  { name: "Rejected", isLostStage: true, isNoReplyStage: false },
] as const;

export async function getColumns(): Promise<Column[]> {
  return listColumns();
}

/** Seed idempotent des 6 colonnes par défaut (no-op si des colonnes existent déjà). */
export async function ensureDefaultColumns(): Promise<void> {
  const existing = await listColumns();
  if (existing.length > 0) return;

  await insertColumns(
    DEFAULT_COLUMNS.map(({ name, isLostStage, isNoReplyStage }, position) => ({
      name,
      position,
      isDefault: true,
      isLostStage,
      isNoReplyStage,
    })),
  );
}

/** Zone libre : positions 1..count-TERMINAL_COUNT (entre l'entrée et les 2 sorties fixes). */
function assertIndexInFreeZone(index: number, columnCount: number): void {
  const maxIndex = columnCount - TERMINAL_COUNT;
  if (index < 1 || index > maxIndex) {
    throw new ServiceError(
      "VALIDATION",
      `index must be between 1 and ${maxIndex}`,
    );
  }
}

export async function createColumn(input: CreateColumnInput): Promise<Column> {
  const { name, index, isLostStage } = parseInput(CreateColumnSchema, input);
  const existing = await listColumns();
  assertIndexInFreeZone(index, existing.length);

  return insertColumnAt({
    name,
    position: index,
    isDefault: false,
    isLostStage,
  });
}

/**
 * Bascule vert/rouge d'une colonne existante. La colonne d'entrée (position 0)
 * n'est ni un succès ni un échec — sa catégorie est fixe et non modifiable.
 */
export async function setColumnCategory(
  id: string,
  input: SetColumnCategoryInput,
): Promise<Column> {
  const { isLostStage } = parseInput(SetColumnCategorySchema, input);
  const column = await getColumnById(id);
  if (!column) {
    throw new ServiceError("NOT_FOUND", `Column ${id} not found`);
  }

  if (column.position === 0) {
    throw new ServiceError(
      "VALIDATION",
      "Entry column category cannot be changed",
    );
  }

  const updated = await updateColumn(id, { isLostStage });
  if (!updated) {
    throw new ServiceError("NOT_FOUND", `Column ${id} not found`);
  }
  return updated;
}

export async function renameColumn(
  id: string,
  input: RenameColumnInput,
): Promise<Column> {
  const { name } = parseInput(RenameColumnSchema, input);
  const column = await getColumnById(id);
  if (!column) {
    throw new ServiceError("NOT_FOUND", `Column ${id} not found`);
  }

  const updated = await updateColumn(id, { name });
  if (!updated) {
    throw new ServiceError("NOT_FOUND", `Column ${id} not found`);
  }
  return updated;
}

export async function reorderColumn(
  id: string,
  input: ReorderColumnInput,
): Promise<Column> {
  const { index } = parseInput(ReorderColumnSchema, input);
  const column = await getColumnById(id);
  if (!column) {
    throw new ServiceError("NOT_FOUND", `Column ${id} not found`);
  }

  const existing = await listColumns();
  const isProtectedPosition =
    column.position === 0 ||
    column.position >= existing.length - TERMINAL_COUNT;
  if (isProtectedPosition) {
    throw new ServiceError(
      "VALIDATION",
      "Entry and terminal columns cannot be reordered",
    );
  }
  assertIndexInFreeZone(index, existing.length);

  return moveColumnToPosition(id, column.position, index);
}

export async function deleteColumn(id: string): Promise<void> {
  const column = await getColumnById(id);
  if (!column) {
    throw new ServiceError("NOT_FOUND", `Column ${id} not found`);
  }

  if (column.isDefault) {
    throw new ServiceError("CONFLICT", "Default columns cannot be deleted");
  }

  const applicationCount = await countApplicationsInColumn(id);
  if (applicationCount > 0) {
    throw new ServiceError(
      "CONFLICT",
      "Column must be empty before it can be deleted",
    );
  }

  await removeColumnAndCloseGap(id, column.position);
}
