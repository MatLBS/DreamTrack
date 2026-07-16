import { BoardView } from "@/components/kanban/board-view";
import { getBoard } from "@/services/application";
import { getSankeyData } from "@/services/sankey";

export const dynamic = "force-dynamic";

export default async function ApplicationTrackPage() {
  const [board, sankey] = await Promise.all([getBoard(), getSankeyData()]);

  return <BoardView initialBoard={board} initialSankey={sankey} />;
}
