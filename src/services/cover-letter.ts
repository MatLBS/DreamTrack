import type { CoverLetterRow } from "@/db/schema";
import {
  GenerateCoverLetterSchema,
  SaveCoverLetterSchema,
  type GenerateCoverLetterInput,
  type SaveCoverLetterInput,
} from "@/lib/validation/cover-letter";
import {
  deleteCoverLetter,
  getCoverLetterById,
  insertCoverLetter,
  listCoverLetters,
  updateCoverLetter,
} from "@/queries/cover-letter";

import { parseInput, ServiceError } from "./errors";
import { resolveLlmCredential } from "./llm-credential";
import { getProfile } from "./profile";

export interface CoverLetterDraft {
  paragraphs: string[];
  usedFacts: string[];
  insufficientContext: boolean;
}

interface PythonGenerateLetterResponse {
  paragraphs: string[];
  usedFacts: string[];
  insufficientContext: boolean;
}

function resolvePythonServiceUrl(): string {
  return process.env.AI_WATCH_PYTHON_SERVICE_URL || "http://localhost:8008";
}

async function extractErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    return body.detail ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * Génère une lettre via le service Python : retrieval des extraits pertinents du CV
 * dans Chroma puis génération LLM ancrée sur ces faits. Ne persiste rien — le
 * brouillon est renvoyé au client, qui l'enregistre explicitement s'il le souhaite.
 */
export async function generateCoverLetter(
  userId: string,
  input: GenerateCoverLetterInput,
): Promise<CoverLetterDraft> {
  const { company, role, description, tone } = parseInput(
    GenerateCoverLetterSchema,
    input,
  );

  const { provider, apiKey, modelExtraction } =
    await resolveLlmCredential(userId);

  // La même clé sert aux embeddings du retrieval — même contrainte que l'upload.
  if (provider !== "openai") {
    throw new ServiceError(
      "EMBEDDING_PROVIDER_UNSUPPORTED",
      "Letter generation requires an OpenAI API key",
    );
  }

  const profile = await getProfile(userId);

  let response: Response;
  try {
    response = await fetch(`${resolvePythonServiceUrl()}/generate-letter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        apiKey,
        provider,
        model: modelExtraction,
        offer: { company, role, description: description ?? null },
        profile: {
          desiredPositions: profile?.desiredPositions ?? [],
          locations: profile?.locations ?? [],
          skills: profile?.skills ?? [],
          industries: profile?.industries ?? [],
          workplacePreference: profile?.workplacePreference ?? [],
          yearsOfExperience: profile?.yearsOfExperience ?? null,
          salaryMin: profile?.salaryMin ?? null,
          salaryMax: profile?.salaryMax ?? null,
        },
        tone,
      }),
    });
  } catch (error) {
    throw new ServiceError(
      "LETTER_GENERATION_FAILED",
      error instanceof Error ? error.message : "Request failed",
    );
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(response);
    // 400 = aucun document indexé pour cet utilisateur (NoIndexedDocumentsError).
    throw new ServiceError(
      response.status === 400
        ? "NO_INDEXED_DOCUMENTS"
        : "LETTER_GENERATION_FAILED",
      detail,
    );
  }

  const result = (await response.json()) as PythonGenerateLetterResponse;

  return {
    paragraphs: result.paragraphs,
    usedFacts: result.usedFacts,
    insufficientContext: result.insufficientContext,
  };
}

export async function saveCoverLetter(
  userId: string,
  input: SaveCoverLetterInput,
): Promise<CoverLetterRow> {
  const values = parseInput(SaveCoverLetterSchema, input);
  return insertCoverLetter(userId, values);
}

export async function updateCoverLetterText(
  userId: string,
  id: string,
  paragraphs: string[],
): Promise<CoverLetterRow> {
  const letter = await updateCoverLetter(userId, id, { paragraphs });
  if (!letter) {
    throw new ServiceError("COVER_LETTER_NOT_FOUND", "Cover letter not found");
  }
  return letter;
}

export async function listUserCoverLetters(
  userId: string,
): Promise<CoverLetterRow[]> {
  return listCoverLetters(userId);
}

export async function removeCoverLetter(
  userId: string,
  id: string,
): Promise<void> {
  const letter = await getCoverLetterById(userId, id);
  if (!letter) {
    throw new ServiceError("COVER_LETTER_NOT_FOUND", "Cover letter not found");
  }
  await deleteCoverLetter(userId, id);
}
