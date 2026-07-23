"""Serveur FastAPI exposant la pipeline AI Watch via HTTP.

Point d'entrée pour le scheduler TypeScript — accepte provider/apiKey dynamiques.
"""

from fastapi import FastAPI, HTTPException
import logging

from ai_watch.api_schemas import (
    RunPipelineRequest,
    RunPipelineResponse,
    ScoredOfferResponse,
)
from ai_watch.agent.agent import create_llm, compiled_graph

app = FastAPI(
    title="AI Watch Service",
    version="1.0.0",
    description="Service Python de scoring d'offres d'emploi via LangGraph + LLM",
)

logger = logging.getLogger(__name__)


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
        # 1. Créer le LLM avec le provider/key de l'utilisateur
        llm = create_llm(request.provider, request.api_key)

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


@app.get("/health")
async def health():
    """Health check endpoint pour monitoring."""
    return {"status": "ok", "service": "ai-watch-service"}
