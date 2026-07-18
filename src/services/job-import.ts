import { extractJobPosting } from "@/lib/ai/job-extraction-agent";
import { PageFetchError, fetchPageHtml } from "@/lib/scraping/fetch-page";
import { htmlToPlainText } from "@/lib/scraping/html-text";
import {
  ImportJobFromUrlSchema,
  type ImportJobFromUrlInput,
} from "@/lib/validation/job-import";

import { parseInput, ServiceError } from "./errors";
import { resolveLlmCredential } from "./llm-credential";

export interface JobImportDraft {
  company: string;
  role: string;
  url: string;
  notes: string | null;
}

function isAuthError(error: unknown): boolean {
  const status = (error as { status?: number } | undefined)?.status;
  if (status === 401) return true;
  const message = error instanceof Error ? error.message : "";
  return /authentication_error|invalid x-api-key|401/i.test(message);
}

/**
 * Récupère la page, en extrait un brouillon de candidature via l'agent LangChain,
 * et le renvoie sans rien écrire en base — l'utilisateur valide depuis le formulaire.
 */
export async function importJobFromUrl(
  userId: string,
  input: ImportJobFromUrlInput,
): Promise<JobImportDraft> {
  const { url } = parseInput(ImportJobFromUrlSchema, input);

  const { provider, apiKey } = await resolveLlmCredential(userId);

  let html: string;
  try {
    html = await fetchPageHtml(url);
  } catch (error) {
    if (error instanceof PageFetchError) {
      throw new ServiceError(
        error.reason === "blocked" ? "PAGE_BLOCKED" : "PAGE_FETCH_FAILED",
        error.message,
      );
    }
    throw error;
  }

  const pageText = htmlToPlainText(html);

  let draft;
  try {
    draft = await extractJobPosting({ provider, apiKey, pageText, url });
  } catch (error) {
    if (isAuthError(error)) {
      throw new ServiceError(
        "LLM_KEY_INVALID",
        "The configured API key was rejected",
      );
    }
    throw new ServiceError(
      "LLM_REQUEST_FAILED",
      error instanceof Error ? error.message : "LLM request failed",
    );
  }

  if (!draft.company || !draft.role) {
    throw new ServiceError(
      "NOT_A_JOB_POSTING",
      `Could not find a job posting at ${url}`,
    );
  }

  const notes = [draft.location ? `📍 ${draft.location}` : null, draft.notes]
    .filter((line): line is string => Boolean(line))
    .join("\n\n");

  return {
    company: draft.company,
    role: draft.role,
    url,
    notes: notes || null,
  };
}
