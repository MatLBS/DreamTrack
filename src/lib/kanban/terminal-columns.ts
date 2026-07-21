import type { Column } from "@/db/schema";

/** Deux colonnes fixes en sortie (cf. `TERMINAL_COUNT` dans `services/column.ts`). */
const TERMINAL_COUNT = 2;

/**
 * Colonne d'acceptation : colonne terminale non "lost" (`Accepted` par défaut).
 * Basé sur `position`/`isLostStage` plutôt que sur le nom pour rester valide
 * même si l'utilisateur renomme la colonne.
 */
export function findAcceptedColumn(columns: Column[]): Column | undefined {
  const terminalColumns = [...columns]
    .sort((a, b) => a.position - b.position)
    .slice(-TERMINAL_COUNT);
  return terminalColumns.find((column) => !column.isLostStage);
}
