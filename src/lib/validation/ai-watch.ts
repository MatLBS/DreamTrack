import { z } from "zod";

/** 6h / quotidien / hebdomadaire — pas plus fréquent : les offres ne bougent pas à l'heure,
 * et un intervalle plus court multiplierait le risque de blocage anti-bot et le coût LLM. */
export const AI_WATCH_INTERVALS_MINUTES = [360, 1440, 10080] as const;

export const SaveAiWatchConfigSchema = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.union([
    z.literal(AI_WATCH_INTERVALS_MINUTES[0]),
    z.literal(AI_WATCH_INTERVALS_MINUTES[1]),
    z.literal(AI_WATCH_INTERVALS_MINUTES[2]),
  ]),
});

export type SaveAiWatchConfigInput = z.infer<typeof SaveAiWatchConfigSchema>;

export const DismissOfferSchema = z.object({
  offerId: z.string().min(1),
});

export type DismissOfferInput = z.infer<typeof DismissOfferSchema>;
