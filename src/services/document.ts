import {
  deleteDocument,
  getDocumentById,
  insertDocument,
  listDocuments,
} from "@/queries/document";
import type { WorkshopDocumentRow } from "@/db/schema";
import {
  UploadDocumentSchema,
  type UploadDocumentInput,
} from "@/lib/validation/document";

import { parseInput, ServiceError } from "./errors";
import { resolveLlmCredential } from "./llm-credential";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

interface UploadDocumentServiceInput extends UploadDocumentInput {
  file: File;
}

interface PythonUploadResponse {
  documentId: string;
  kind: string;
  chunkCount: number;
  collectionName: string;
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
 * Uploade un document (CV, lettre) vers le service Python : parsing PDF, chunking,
 * embeddings et upsert dans la collection Chroma de l'utilisateur. L'appel est
 * synchrone — on ne persiste en base qu'une fois le résultat connu (`ready` ou
 * `failed`), il n'y a pas d'état intermédiaire côté serveur.
 */
export async function uploadDocument(
  userId: string,
  input: UploadDocumentServiceInput,
): Promise<WorkshopDocumentRow> {
  const { kind, title } = parseInput(UploadDocumentSchema, input);
  const { file } = input;

  if (file.type !== "application/pdf") {
    throw new ServiceError(
      "UNSUPPORTED_DOCUMENT_TYPE",
      "Only application/pdf is supported",
    );
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new ServiceError("DOCUMENT_TOO_LARGE", "File exceeds 10MB limit");
  }

  const { provider, apiKey } = await resolveLlmCredential(userId);
  if (provider !== "openai") {
    throw new ServiceError(
      "EMBEDDING_PROVIDER_UNSUPPORTED",
      "Document embeddings require an OpenAI API key",
    );
  }

  const formData = new FormData();
  formData.set("userId", userId);
  formData.set("kind", kind);
  formData.set("apiKey", apiKey);
  formData.set("file", file);

  let response: Response;
  try {
    response = await fetch(`${resolvePythonServiceUrl()}/documents/upload`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    await insertDocument(userId, {
      kind,
      title,
      chromaDocumentId: "",
      collectionName: "",
      chunkCount: 0,
      status: "failed",
      errorMessage: message,
    });
    throw new ServiceError("DOCUMENT_INGESTION_FAILED", message);
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(response);
    await insertDocument(userId, {
      kind,
      title,
      chromaDocumentId: "",
      collectionName: "",
      chunkCount: 0,
      status: "failed",
      errorMessage: detail,
    });
    throw new ServiceError("DOCUMENT_INGESTION_FAILED", detail);
  }

  const result = (await response.json()) as PythonUploadResponse;

  return insertDocument(userId, {
    kind,
    title,
    chromaDocumentId: result.documentId,
    collectionName: result.collectionName,
    chunkCount: result.chunkCount,
    status: "ready",
    errorMessage: null,
  });
}

export async function listUserDocuments(
  userId: string,
): Promise<WorkshopDocumentRow[]> {
  return listDocuments(userId);
}

/**
 * Supprime uniquement la ligne de métadonnées. Le service Python n'expose pas
 * (encore) d'endpoint de suppression : les chunks correspondants restent dans
 * Chroma, orphelins — dette assumée tant que cet endpoint n'existe pas.
 */
export async function removeDocument(
  userId: string,
  id: string,
): Promise<void> {
  const document = await getDocumentById(userId, id);
  if (!document) {
    throw new ServiceError("DOCUMENT_NOT_FOUND", "Document not found");
  }
  await deleteDocument(userId, id);
}
