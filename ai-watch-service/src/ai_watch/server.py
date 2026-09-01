"""Serveur FastAPI exposant la pipeline AI Watch via HTTP.

Point d'entrée pour le scheduler TypeScript — accepte provider/apiKey dynamiques.
"""

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
import logging
import os
from typing import Literal

from ai_watch.api_schemas import (
    RunPipelineRequest,
    RunPipelineResponse,
    ScoredOfferResponse,
    UploadDocumentResponse,
)
from ai_watch.agent.agent import create_llm, compiled_graph
from ai_watch.documents import ingest_document

app = FastAPI(
    title="AI Watch Service",
    version="1.0.0",
    description="Service Python de scoring d'offres d'emploi via LangGraph + LLM",
)

logger = logging.getLogger(__name__)

CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", ".chroma-data")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 Mo — même limite que celle validée côté front (design doc)


@app.post("/run", response_model=RunPipelineResponse)
async def run_pipeline(request: RunPipelineRequest):
    """
    Exécute la pipeline de scoring pour un utilisateur.

    Étapes :
    1. Fetch des offres depuis hiring.cafe (positions × locations)
    2. Pré-filtres (déjà vues, déjà dans Kanban) — TODO
    3. Scoring parallèle via LLM (provider/apiKey dynamiques)
    4. Keep/Drop (seuil ≥ 50)

    Args:
        request: Profil candidat + credentials LLM

    Returns:
        Liste des offres scorées au-dessus du seuil

    Raises:
        HTTPException: 500 si erreur pipeline (fetch, LLM, etc.)
    """
    try:
        # 1. Créer le LLM avec le provider/key/model de l'utilisateur
        llm = create_llm(request.provider, request.api_key, request.model_scoring)

        # 2. Construire l'input state pour LangGraph
        initial_state = {
            "positions": request.profile.desired_positions,
            "locations": request.profile.locations,
            "profile": {
                "skills": request.profile.skills,
                "years_of_experience": request.profile.years_of_experience,
                "industries": request.profile.industries,
                "workplace_preference": request.profile.workplace_preference,
                "salary_min": request.profile.salary_min,
                "salary_max": request.profile.salary_max,
            },
            "llm": llm,
            "job_offers": None,
            "scored_offers": [],
        }

        # 3. Exécuter le graph LangGraph
        logger.info(f"Running pipeline for user {request.user_id} with {request.provider}")
        result = compiled_graph.invoke(initial_state)

        # 4. Convertir les résultats au format API TypeScript
        offers = [
            ScoredOfferResponse(
                source=offer["source"],
                external_id=offer["external_id"],
                company=offer["company_name"],
                role=offer["title"],
                url=offer["apply_url"],
                location=offer.get("location"),
                description=offer.get("requirements_summary"),
                match_score=offer["match_score"],
                match_reason=offer.get("match_reason"),
            )
            for offer in result.get("scored_offers", [])
        ]

        logger.info(f"Pipeline completed: {len(offers)} offers returned for user {request.user_id}")
        return RunPipelineResponse(offers=offers)

    except ValueError as e:
        # Provider invalide ou erreur de validation
        logger.error(f"Validation error for user {request.user_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Erreur pipeline (fetch, LLM rate-limit, etc.)
        logger.exception(f"Pipeline failed for user {request.user_id}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


@app.post("/documents/upload", response_model=UploadDocumentResponse)
async def upload_document(
    user_id: str = Form(alias="userId"),
    kind: Literal["cv", "cover_letter", "other"] = Form(alias="kind"),
    api_key: str = Form(alias="apiKey"),
    file: UploadFile = File(...),
):
    """
    Ingère un document PDF (CV, lettre de motivation) dans la base vectorielle
    de l'utilisateur.

    Étapes :
    1. Validation du fichier (type MIME, taille)
    2. Extraction du texte (pypdf)
    3. Découpage en chunks (~1000 caractères, overlap 200)
    4. Embeddings OpenAI (text-embedding-3-small, clé fournie par requête)
    5. Upsert dans la collection Chroma de l'utilisateur (persist_directory local/volume)

    Args:
        user_id: Identifiant utilisateur (détermine la collection Chroma cible)
        kind: Nature du document — pilote son rôle dans un futur prompt de génération
        api_key: Clé API OpenAI (embeddings uniquement, jamais lue depuis l'environnement)
        file: Fichier PDF (10 Mo max)

    Returns:
        document_id généré, nombre de chunks indexés

    Raises:
        HTTPException: 400 si fichier invalide/vide, 500 si erreur pipeline
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only application/pdf is supported")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    try:
        logger.info(f"Ingesting document ({kind}) for user {user_id}")
        document_id, chunk_count, collection_name = ingest_document(
            user_id=user_id,
            kind=kind,
            pdf_bytes=pdf_bytes,
            api_key=api_key,
            persist_directory=CHROMA_PERSIST_DIRECTORY,
        )
        logger.info(f"Document {document_id} ingested for user {user_id}: {chunk_count} chunks")
        return UploadDocumentResponse(
            document_id=document_id,
            user_id=user_id,
            kind=kind,
            chunk_count=chunk_count,
            collection_name=collection_name,
        )
    except ValueError as e:
        # EmptyDocumentError hérite de ValueError — capturé ici, pas besoin d'un branch séparé
        logger.error(f"Validation error for user {user_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Document ingestion failed for user {user_id}")
        raise HTTPException(status_code=500, detail=f"Ingestion error: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint pour monitoring."""
    return {"status": "ok", "service": "ai-watch-service"}
