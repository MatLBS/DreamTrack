from typing import TypedDict, Any
from ai_watch.offer import RawOffer
from typing_extensions import Annotated
from operator import add

class Scoring(TypedDict):
    match_score: int
    match_reason: str | None


class ScoredOffer(TypedDict):
    # Toutes les données de l'offre brute
    source: str
    external_id: str
    title: str
    company_name: str
    apply_url: str
    location: str | None
    requirements_summary: str
    technical_tools: list[str]
    min_years_experience: int | None
    seniority_level: str | None
    salary_min: int | None
    salary_max: int | None
    salary_currency: str | None
    workplace_type: str | None
    company_industries: list[str]

    # + Les résultats du scoring
    match_score: int
    match_reason: str | None


class OfferScore(TypedDict):
    match_score: int
    match_reason: str


class Profile(TypedDict):
    skills: list[str]
    years_of_experience: int
    industries: list[str]
    workplace_preference: list[str]
    salary_min: int | None
    salary_max: int | None


class JobsAgentState(TypedDict):
    # Raw job search request data
    positions: list[str]
    locations: list[str]

    # Attributs candidat (pour le scoring)
    profile: Profile

    # LLM instance (passée en runtime, non sérialisable)
    llm: Any

    # Job offers fetched
    job_offers: list[RawOffer] | None

    # Scoring result
    scored_offers: Annotated[list[ScoredOffer], add]