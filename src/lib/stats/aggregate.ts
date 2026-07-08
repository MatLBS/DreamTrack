import type { Application, Column, Transition } from "@/db/schema";

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
 * Statistiques dérivées du Kanban (colonnes, cartes, transitions).
 *
 * `pending` = cartes encore dans la colonne d'entrée (position 0).
 * `offers` = cartes dans la colonne d'acceptation (colonne non "lost" parmi les
 * colonnes terminales — cf. `TERMINAL_COUNT` dans `services/column.ts`).
 * `responseRate` = % de cartes ayant atteint au moins une colonne "réponse"
 * (ni la colonne d'entrée, ni une colonne "lost" — donc "Sans réponse" ne
 * compte pas comme une réponse, mais "Réponses reçues"/"Acceptées" oui).
 */
export function aggregateStats(
  columns: Column[],
  applications: Application[],
  transitions: Transition[],
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

  const respondedApplicationIds = new Set<string>();
  for (const transition of transitions) {
    const toColumn = columns.find(
      (column) => column.id === transition.toColumnId,
    );
    if (!toColumn) continue;
    if (toColumn.id === entryColumn.id || toColumn.isLostStage) continue;
    respondedApplicationIds.add(transition.applicationId);
  }

  const total = applications.length;
  const pending = applications.filter(
    (application) => application.columnId === entryColumn.id,
  ).length;
  const offers = acceptedColumn
    ? applications.filter(
        (application) => application.columnId === acceptedColumn.id,
      ).length
    : 0;
  const responseRate =
    total === 0 ? 0 : Math.round((respondedApplicationIds.size / total) * 100);

  return { total, responseRate, pending, offers };
}
