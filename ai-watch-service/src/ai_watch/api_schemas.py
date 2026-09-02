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
    locations: list[str] = Field(default_factory=list)
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
    provider: Literal["anthropic", "openai", "openrouter"]
    api_key: str = Field(alias="apiKey")
    model_scoring: str | None = Field(None, alias="modelScoring")


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


class UploadDocumentResponse(BaseModel):
    """Réponse HTTP de POST /documents/upload."""

    model_config = ConfigDict(populate_by_name=True)

    document_id: str = Field(alias="documentId")
    user_id: str = Field(alias="userId")
    kind: Literal["cv", "cover_letter", "other"]
    chunk_count: int = Field(alias="chunkCount")
    collection_name: str = Field(alias="collectionName")


class OfferInputSchema(BaseModel):
    """Offre ciblée reçue depuis TypeScript pour la génération de lettre."""

    model_config = ConfigDict(populate_by_name=True)

    company: str
    role: str
    description: str | None = None


class GenerateLetterRequest(BaseModel):
    """Requête HTTP POST /generate-letter depuis TypeScript."""

    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(alias="userId")
    api_key: str = Field(alias="apiKey")
    provider: Literal["anthropic", "openai", "openrouter"]
    model: str | None = None
    offer: OfferInputSchema
    profile: ProfileInput
    tone: Literal["formal", "conversational"]


class GenerateLetterResponse(BaseModel):
    """Réponse HTTP de POST /generate-letter."""

    model_config = ConfigDict(populate_by_name=True)

    paragraphs: list[str]
    used_facts: list[str] = Field(alias="usedFacts")
    insufficient_context: bool = Field(alias="insufficientContext")
