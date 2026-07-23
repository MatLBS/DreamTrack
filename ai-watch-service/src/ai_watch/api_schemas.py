"""Schémas Pydantic pour l'API HTTP FastAPI.

Ces schémas gèrent la sérialisation/désérialisation entre le format TypeScript
(camelCase) et le format Python (snake_case).
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Literal


class ProfileInput(BaseModel):
    """Profil candidat reçu depuis TypeScript."""

    model_config = ConfigDict(populate_by_name=True)

    desired_positions: list[str] = Field(alias="desiredPositions")
    locations: list[str]
    skills: list[str]
    industries: list[str]
    workplace_preference: list[str] = Field(alias="workplacePreference")
    years_of_experience: int | None = Field(None, alias="yearsOfExperience")
    salary_min: int | None = Field(None, alias="salaryMin")
    salary_max: int | None = Field(None, alias="salaryMax")


class RunPipelineRequest(BaseModel):
    """Requête HTTP POST /run depuis TypeScript."""

    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(alias="userId")
    profile: ProfileInput
    provider: Literal["anthropic", "openai"]
    api_key: str = Field(alias="apiKey")


class ScoredOfferResponse(BaseModel):
    """Offre scorée retournée à TypeScript."""

    model_config = ConfigDict(populate_by_name=True)

    source: str
    external_id: str = Field(alias="externalId")
    company: str
    role: str
    url: str
    location: str | None
    description: str | None
    match_score: int = Field(alias="matchScore")
    match_reason: str | None = Field(alias="matchReason")


class RunPipelineResponse(BaseModel):
    """Réponse HTTP de /run."""

    offers: list[ScoredOfferResponse]
