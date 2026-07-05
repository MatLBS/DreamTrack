import { BoardView } from "@/components/kanban/board-view";
import { getBoard } from "@/services/application";
import { getSankeyData } from "@/services/sankey";

export default async function Home() {
  const [board, sankey] = await Promise.all([getBoard(), getSankeyData()]);

  return <BoardView initialBoard={board} initialSankey={sankey} />;
}
