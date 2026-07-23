import { headers } from "next/headers";

import { AiWatchContent } from "@/components/ai-watch/ai-watch-content";
import { auth } from "@/lib/auth";
import { getColumns } from "@/services/column";
import { getConfig, listOffers } from "@/services/ai-watch/config";

export default async function AiWatchPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [config, offers, columns] = await Promise.all([
    getConfig(session.user.id),
    listOffers(session.user.id),
    getColumns(session.user.id),
  ]);

  const entryColumnId = columns[0]?.id;

  return (
    <AiWatchContent
      initialConfig={config}
      initialOffers={offers}
      entryColumnId={entryColumnId}
    />
  );
}
