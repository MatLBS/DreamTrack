import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

import type { LlmProvider } from "@/lib/validation/llm-credential";
import {
  JobPostingDraftSchema,
  type JobPostingDraft,
} from "@/lib/validation/job-import";

const MODEL_BY_PROVIDER: Record<LlmProvider, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4o",
};

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

function buildChatModel(provider: LlmProvider, apiKey: string): BaseChatModel {
  const model = MODEL_BY_PROVIDER[provider];
  switch (provider) {
    case "anthropic":
      return new ChatAnthropic({ apiKey, model, temperature: 0 });
    case "openai":
      return new ChatOpenAI({ apiKey, model, temperature: 0 });
  }
}

export interface ExtractJobPostingInput {
  provider: LlmProvider;
  apiKey: string;
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
  pageText,
  url,
}: ExtractJobPostingInput): Promise<JobPostingDraft> {
  const model = buildChatModel(provider, apiKey);

  const structuredModel = model.withStructuredOutput(JobPostingDraftSchema, {
    name: "create_application",
  });

  return structuredModel.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(`Source URL: ${url}\n\nPage text:\n${pageText}`),
  ]);
}
