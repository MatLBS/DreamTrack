"""Pipeline d'ingestion de documents (CV, lettres) dans la base vectorielle Chroma.

Parsing PDF → chunking → embeddings → upsert. Pipeline complet côté ai-watch-service
(divergence documentée avec docs/superpowers/specs/2026-09-01-rag-cover-letter-design.md,
qui plaçait parsing/chunking côté Next.js).
"""

import io
import re
import uuid
from typing import Literal

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

_COLLECTION_PREFIX = "user_"
_SAFE_ID_RE = re.compile(r"[^a-zA-Z0-9_-]")


class EmptyDocumentError(ValueError):
    """PDF sans texte extractible (ex. scan sans couche texte) — jamais d'indexation silencieuse de rien."""


def safe_collection_name(user_id: str) -> str:
    """Normalise user_id en nom de collection Chroma valide (3-63 car., alphanum + _ -,
    doit commencer/finir par alphanum). Défensif : user_id vient de la DB Next.js et est
    déjà propre en pratique, mais on évite de laisser Chroma lever une erreur peu claire."""
    cleaned = _SAFE_ID_RE.sub("_", user_id)
    return f"{_COLLECTION_PREFIX}{cleaned}"[:63]


def extract_text(pdf_bytes: bytes) -> str:
    """Extrait le texte brut d'un PDF. Lève EmptyDocumentError si aucune page ne contient
    de texte extractible."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages_text = [page.extract_text() or "" for page in reader.pages]
    text = "\n\n".join(t for t in pages_text if t.strip())
    if not text.strip():
        raise EmptyDocumentError("no extractable text in PDF (possibly a scanned document)")
    return text


def chunk_text(text: str) -> list[str]:
    """Découpe en passages ~1000 caractères, overlap 200 — tailles reprises du design doc
    RAG (Partie 2) : un CV est structuré en blocs courts (une expérience, une formation),
    cette taille garde un bloc entier avec son contexte, l'overlap évite de couper une
    expérience en deux."""
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    return splitter.split_text(text)


def ingest_document(
    *,
    user_id: str,
    kind: Literal["cv", "cover_letter", "other"],
    pdf_bytes: bytes,
    api_key: str,
    persist_directory: str,
) -> tuple[str, int, str]:
    """Pipeline complet : parse → chunk → embed → upsert dans la collection de l'utilisateur.

    Returns:
        (document_id, chunk_count, collection_name)

    Raises:
        EmptyDocumentError: PDF sans texte extractible
    """
    document_id = str(uuid.uuid4())
    text = extract_text(pdf_bytes)
    chunks = chunk_text(text)

    embeddings = OpenAIEmbeddings(api_key=api_key, model="text-embedding-3-small")
    collection_name = safe_collection_name(user_id)
    store = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=persist_directory,
    )

    metadatas = [{"documentId": document_id, "kind": kind, "chunkIndex": i} for i in range(len(chunks))]
    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    store.add_texts(texts=chunks, metadatas=metadatas, ids=ids)

    return document_id, len(chunks), collection_name
