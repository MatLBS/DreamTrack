"""Tests pour l'API HTTP FastAPI."""

from fastapi.testclient import TestClient
from ai_watch.server import app

client = TestClient(app)


def test_health():
    """Le endpoint /health retourne OK."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ai-watch-service"}


def test_run_pipeline_missing_fields():
    """Requête sans body → erreur de validation."""
    response = client.post("/run", json={})
    assert response.status_code == 422


def test_run_pipeline_invalid_provider():
    """Provider invalide → erreur de validation."""
    response = client.post(
        "/run",
        json={
            "userId": "test-user",
            "profile": {
                "desiredPositions": ["Data Scientist"],
                "locations": ["Paris"],
                "skills": [],
                "industries": [],
                "workplacePreference": [],
                "yearsOfExperience": None,
                "salaryMin": None,
                "salaryMax": None,
            },
            "provider": "invalid-provider",  # ❌
            "apiKey": "sk-test",
        },
    )
    assert response.status_code == 422


def test_run_pipeline_minimal_valid_request():
    """Requête valide minimale → passe la validation.

    Note: Ce test échouera car on utilise une fausse clé API.
    Pour tester réellement, il faudrait mocker le LLM.
    """
    response = client.post(
        "/run",
        json={
            "userId": "test-user",
            "profile": {
                "desiredPositions": ["Data Scientist"],
                "locations": ["Paris"],
                "skills": ["Python"],
                "industries": ["Tech"],
                "workplacePreference": ["Remote"],
                "yearsOfExperience": 5,
                "salaryMin": 50000,
                "salaryMax": 80000,
            },
            "provider": "openai",
            "apiKey": "sk-fake-key-for-validation-test",
        },
    )

    # Validation OK, mais échec sur l'API key invalide
    assert response.status_code in [400, 500]  # Dépend de l'erreur LLM


# TODO: Ajouter tests avec mock LLM pour vérifier le flux complet
