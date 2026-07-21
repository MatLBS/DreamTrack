"use server";

import type { SankeyData } from "@/lib/sankey/aggregate";
import { requireAuth } from "@/lib/auth-guard";
import { getBoard, type BoardColumn } from "@/services/application";
import { getSankeyData } from "@/services/sankey";

/**
 * Lectures rejouables côté client : servent de `queryFn` à TanStack Query
 * pour refetch après invalidation (pas de route API, on rappelle le service
 * via Server Action).
 */
export async function getBoardAction(): Promise<BoardColumn[]> {
  const session = await requireAuth();
  return getBoard(session.user.id);
}

export async function getSankeyAction(): Promise<SankeyData> {
  const session = await requireAuth();
  return getSankeyData(session.user.id);
}
