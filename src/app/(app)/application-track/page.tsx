import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { BoardView } from "@/components/kanban/board-view";
import { auth } from "@/lib/auth";
import { getBoard } from "@/services/application";
import { getSankeyData } from "@/services/sankey";

export const dynamic = "force-dynamic";

export default async function ApplicationTrackPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [board, sankey] = await Promise.all([
    getBoard(session.user.id),
    getSankeyData(session.user.id),
  ]);

  return <BoardView initialBoard={board} initialSankey={sankey} />;
}
