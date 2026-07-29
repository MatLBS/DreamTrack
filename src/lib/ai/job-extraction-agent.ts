import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOpenRouter } from "@langchain/openrouter";

import type { LlmProvider } from "@/lib/validation/llm-credential";
import {
  JobPostingDraftSchema,
  type JobPostingDraft,
} from "@/lib/validation/job-import";

const DEFAULT_EXTRACTION_MODELS: Record<LlmProvider, string> = {
  anthropic: "claude-sonnet-4-5-20250514",
  openai: "gpt-4o",
  openrouter: "anthropic/claude-sonnet-4.5",
};

function resolveExtractionModel(
  provider: LlmProvider,
  customModel: string | null,
): string {
  return customModel ?? DEFAULT_EXTRACTION_MODELS[provider];
}

const SYSTEM_PROMPT = `You extract structured job posting data from raw page text using the \
create_application tool. You must call the tool exactly once with your result.

Rules:
- Only extract from text that is genuinely a single job posting.
- If the text is a job listing page, a 404/error page, a login wall, or otherwise does not \
describe one specific job, return empty strings for "company" and "role" and null for \
"location" and "notes". Never invent or guess a company or role name.
- "notes" should be a short, readable plain-text summary of the job description (a few \
sentences: main responsibilities and requirements), not a copy of the raw text.
- "location" is the city/region if stated, otherwise null.
- Respond only by calling the tool — no other output.`;

function buildChatModel(
  provider: LlmProvider,
  apiKey: string,
  customModel: string | null,
): BaseChatModel {
  const model = resolveExtractionModel(provider, customModel);

  switch (provider) {
    case "anthropic":
      return new ChatAnthropic({ apiKey, model, temperature: 0 });
    case "openai":
      return new ChatOpenAI({ apiKey, model, temperature: 0 });
    case "openrouter":
      return new ChatOpenRouter({
        apiKey,
        model,
        temperature: 0,
        siteUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
        siteName: "DreamTrack Job Extraction",
      });
  }
}

export interface ExtractJobPostingInput {
  provider: LlmProvider;
  apiKey: string;
  modelExtraction: string | null;
  pageText: string;
  url: string;
}

/**
 * Un seul appel outil à sortie structurée (tool-calling via
 * `withStructuredOutput`) — pas de boucle, pas de décision d'outil à faire :
 * la tâche est entièrement spécifiable à l'avance. Réutilisable tel quel comme
 * nœud d'un futur graphe LangGraph (ex. `ai-watch`) si un vrai agent devient utile.
 */
export async function extractJobPosting({
  provider,
  apiKey,
  modelExtraction,
  pageText,
  url,
}: ExtractJobPostingInput): Promise<JobPostingDraft> {
  const model = buildChatModel(provider, apiKey, modelExtraction);

  const structuredModel = model.withStructuredOutput(JobPostingDraftSchema, {
    name: "create_application",
  });

  return structuredModel.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(`Source URL: ${url}\n\nPage text:\n${pageText}`),
  ]);
}
