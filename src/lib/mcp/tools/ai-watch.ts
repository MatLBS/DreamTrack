import type { McpServer } from "@modelcontextprotocol/server";

import { DismissOfferSchema, SaveAiWatchConfigSchema } from "@/lib/validation/ai-watch";
import {
  dismissOfferForUser,
  getConfig,
  listOffers,
  saveConfig,
  triggerRun,
} from "@/services/ai-watch/config";

import { withToolErrors } from "../errors";

/** Longueur au-delà de laquelle une description d'offre est tronquée dans les
 * résultats de tool — sinon une poignée d'offres épuise le contexte de l'agent. */
const DESCRIPTION_PREVIEW_LENGTH = 500;

function truncateDescription(description: string | null): string | null {
  if (description === null || description.length <= DESCRIPTION_PREVIEW_LENGTH) {
    return description;
  }
  return `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH)}… (truncated)`;
}

export function registerAiWatchTools(server: McpServer, userId: string): void {
  server.registerTool(
    "ai_watch_get_config",
    {
      title: "Get AI Watch config",
      description:
        "Returns the AI Watch scouting configuration: enabled, interval, and the status of the last run (lastRunAt, lastRunStatus, lastRunError).",
      annotations: { readOnlyHint: true },
    },
    async () => withToolErrors(() => getConfig(userId)),
  );

  server.registerTool(
    "ai_watch_save_config",
    {
      title: "Save AI Watch config",
      description:
        "Enables or disables AI Watch and sets the scouting interval in minutes (allowed: 360, 1440, 10080).",
      inputSchema: SaveAiWatchConfigSchema,
      annotations: { idempotentHint: true },
    },
    async (input) => withToolErrors(() => saveConfig(userId, input)),
  );

  server.registerTool(
    "ai_watch_list_offers",
    {
      title: "List AI Watch offers",
      description:
        "Returns job offers discovered by AI Watch (non-dismissed, match score >= 40), best match first. Long descriptions are truncated to keep the result compact.",
      annotations: { readOnlyHint: true },
    },
    async () =>
      withToolErrors(async () => {
        const offers = await listOffers(userId);
        return offers.map((offer) => ({
          id: offer.id,
          company: offer.company,
          role: offer.role,
          url: offer.url,
          location: offer.location,
          description: truncateDescription(offer.description),
          matchScore: offer.matchScore,
          matchReason: offer.matchReason,
          discoveredAt: offer.discoveredAt,
        }));
      }),
  );

  server.registerTool(
    "ai_watch_dismiss_offer",
    {
      title: "Dismiss AI Watch offer",
      description: "Marks a discovered offer as dismissed so it stops appearing in ai_watch_list_offers.",
      inputSchema: DismissOfferSchema,
      annotations: { idempotentHint: true },
    },
    async (input) => withToolErrors(() => dismissOfferForUser(userId, input)),
  );

  server.registerTool(
    "ai_watch_trigger_run",
    {
      title: "Trigger AI Watch run",
      description:
        "Starts an AI Watch scouting run in the background and returns immediately — it does not wait for the run to finish, since scoring can take minutes. " +
        "Fails fast with AI_WATCH_RUN_IN_PROGRESS if a run is already active for this user. Poll ai_watch_get_config afterwards to see lastRunStatus.",
    },
    async () =>
      withToolErrors(async () => {
        const started = triggerRun(userId);
        // Avale un rejet tardif (après le retour "started") pour ne jamais
        // crasher le process sur une unhandled rejection : `runForUser`
        // persiste déjà l'échec dans lastRunStatus, rien n'est perdu ici.
        started.catch(() => {});

        const outcome = await Promise.race([
          started.then(() => "completed" as const),
          new Promise<"started">((resolve) => setTimeout(() => resolve("started"), 1500)),
        ]);

        return { status: outcome };
      }),
  );
}
