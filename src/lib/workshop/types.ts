export type { DocumentKind } from "@/lib/validation/document";
export type { WorkshopDocumentRow as WorkshopDocument } from "@/db/schema";

/** Contrat de `POST /generate-letter` (ai-watch-service). */
export interface CoverLetterDraft {
  paragraphs: string[];
  /** Extraits du CV retrouvés par le retrieval — rend la génération vérifiable. */
  usedFacts: string[];
  /** true = les faits indexés ne couvrent pas bien cette offre (garde anti-hallucination). */
  insufficientContext: boolean;
}

export type LetterTone = "formal" | "conversational";

/** Cible de génération : une candidature du Kanban. */
export interface LetterTarget {
  id: string;
  company: string;
  role: string;
}
