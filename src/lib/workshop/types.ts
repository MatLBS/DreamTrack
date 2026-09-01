export type { DocumentKind } from "@/lib/validation/document";
export type { WorkshopDocumentRow as WorkshopDocument } from "@/db/schema";

export interface RetrievedFact {
  id: string;
  content: string;
  documentTitle: string;
}

export interface CoverLetterDraft {
  subject: string;
  paragraphs: string[];
  usedFacts: RetrievedFact[];
}

export type LetterTone = "formal" | "conversational";

/** Cible de génération : une candidature du Kanban. */
export interface LetterTarget {
  id: string;
  company: string;
  role: string;
}
