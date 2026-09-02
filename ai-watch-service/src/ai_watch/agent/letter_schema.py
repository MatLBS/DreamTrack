from typing import Any, Literal, TypedDict


class OfferInput(TypedDict):
    company: str
    role: str
    description: str | None


class LetterProfile(TypedDict):
    desired_positions: list[str]
    skills: list[str]
    industries: list[str]
    workplace_preference: list[str]
    years_of_experience: int | None
    salary_min: int | None
    salary_max: int | None


class RetrievedChunk(TypedDict):
    text: str
    kind: Literal["cv", "cover_letter", "other"]


class LetterOutput(TypedDict):
    paragraphs: list[str]
    used_facts: list[str]
    insufficient_context: bool


class LetterAgentState(TypedDict):
    user_id: str
    offer: OfferInput
    profile: LetterProfile
    tone: Literal["formal", "conversational"]

    # LLM instance (passée en runtime, non sérialisable)
    llm: Any

    persist_directory: str
    embeddings_api_key: str

    fact_chunks: list[RetrievedChunk]
    style_chunks: list[RetrievedChunk]

    letter: LetterOutput | None
