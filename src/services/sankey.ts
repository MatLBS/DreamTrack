import { aggregateSankey, type SankeyData } from "@/lib/sankey/aggregate";
import { listColumns } from "@/queries/column";
import { listTransitions } from "@/queries/transition";

/** Nœuds/liens agrégés à partir des transitions — lecture pour le Sankey. */
export async function getSankeyData(): Promise<SankeyData> {
  const [columns, transitions] = await Promise.all([
    listColumns(),
    listTransitions(),
  ]);

  return aggregateSankey(columns, transitions);
}
