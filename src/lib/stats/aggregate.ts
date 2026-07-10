import type { Application, Column } from "@/db/schema";

export interface ApplicationStats {
  total: number;
  responseRate: number;
  pending: number;
  offers: number;
}

const EMPTY_STATS: ApplicationStats = {
  total: 0,
  responseRate: 0,
  pending: 0,
  offers: 0,
};

/**
 * Statistiques dérivées du Kanban (colonnes, cartes).
 *
 * `pending` = cartes encore dans la colonne d'entrée (position 0).
 * `offers` = cartes dans la colonne d'acceptation (colonne non "lost" parmi les
 * colonnes terminales — cf. `TERMINAL_COUNT` dans `services/column.ts`).
 * `responseRate` = % de cartes actuellement en dehors des colonnes marquées
 * `isNoReplyStage` (ghosting) — un rejet explicite compte comme une réponse,
 * seul le silence ("No reply") n'en compte pas.
 */
export function aggregateStats(
  columns: Column[],
  applications: Application[],
): ApplicationStats {
  if (columns.length === 0) return EMPTY_STATS;

  const entryColumn = columns.reduce((min, column) =>
    column.position < min.position ? column : min,
  );
  const terminalColumns = [...columns]
    .sort((a, b) => a.position - b.position)
    .slice(-2);
  const acceptedColumn =
    terminalColumns.find((column) => !column.isLostStage) ?? terminalColumns[0];

  const noReplyColumnIds = new Set(
    columns
      .filter((column) => column.isNoReplyStage)
      .map((column) => column.id),
  );

  const total = applications.length;
  const pending = applications.filter(
    (application) => application.columnId === entryColumn.id,
  ).length;
  const offers = acceptedColumn
    ? applications.filter(
        (application) => application.columnId === acceptedColumn.id,
      ).length
    : 0;
  const noReplyCount = applications.filter((application) =>
    noReplyColumnIds.has(application.columnId),
  ).length;
  const responseRate =
    total === 0 ? 0 : Math.round(((total - noReplyCount) / total) * 100);

  return { total, responseRate, pending, offers };
}
