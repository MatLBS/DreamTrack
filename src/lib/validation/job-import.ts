import { z } from "zod";

export const ImportJobFromUrlSchema = z.object({
  url: z.url(),
});

export type ImportJobFromUrlInput = z.infer<typeof ImportJobFromUrlSchema>;

/**
 * Sortie de l'extraction — c'est aussi le schéma de l'outil `create_application`
 * exposé à l'agent LangChain (voir `lib/ai/job-extraction-agent.ts`). Des champs
 * vides signifient « ce n'est pas une offre d'emploi », jamais une valeur devinée.
 */
export const JobPostingDraftSchema = z.object({
  company: z.string().trim(),
  role: z.string().trim(),
  location: z.string().trim().nullable(),
  notes: z.string().trim().nullable(),
});

export type JobPostingDraft = z.infer<typeof JobPostingDraftSchema>;
