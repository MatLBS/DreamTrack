import { aggregateSankey, type SankeyData } from "@/lib/sankey/aggregate";
import { listColumns } from "@/queries/column";
import { listTransitions } from "@/queries/transition";

/** Nœuds/liens agrégés à partir des transitions d'un utilisateur — lecture pour le Sankey. */
export async function getSankeyData(userId: string): Promise<SankeyData> {
  const [columns, transitions] = await Promise.all([
    listColumns(userId),
    listTransitions(userId),
  ]);

  return aggregateSankey(columns, transitions);
}
