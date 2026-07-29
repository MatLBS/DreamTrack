from langgraph.graph import StateGraph, START, END
from langgraph.types import Send
from ai_watch.fetch import fetch_offers
from ai_watch.agent.schema import JobsAgentState, ScoredOffer, Scoring
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_openrouter import ChatOpenRouter
from dataclasses import asdict


# Modèles par défaut pour le SCORING (optimisés coût/vitesse)
DEFAULT_SCORING_MODELS = {
    "anthropic": "claude-haiku-4-5-20251001",
    "openai": "gpt-4o-mini",
    "openrouter": "anthropic/claude-haiku-4.5",
}


def resolve_scoring_model(provider: str, custom_model: str | None) -> str:
    """Résout le modèle à utiliser pour le scoring.

    Args:
        provider: "anthropic", "openai", ou "openrouter"
        custom_model: Modèle custom ou None

    Returns:
        Nom du modèle à utiliser
    """
    return custom_model if custom_model else DEFAULT_SCORING_MODELS[provider]


def create_llm(provider: str, api_key: str, custom_model: str | None = None):
    """Initialise le LLM approprié avec la clé fournie.

    Args:
        provider: "anthropic", "openai", ou "openrouter"
        api_key: Clé API de l'utilisateur
        custom_model: Modèle custom ou None (utilise le défaut du provider)

    Returns:
        Instance LLM configurée

    Raises:
        ValueError: Si provider inconnu
    """
    model = resolve_scoring_model(provider, custom_model)

    if provider == "anthropic":
        return ChatAnthropic(api_key=api_key, model=model)
    elif provider == "openai":
        return ChatOpenAI(api_key=api_key, model=model)
    elif provider == "openrouter":
        return ChatOpenRouter(
            api_key=api_key,
            model=model,
            site_url="http://localhost:3000",
            site_name="DreamTrack AI Watch",
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")

def fetch_data(state: JobsAgentState) -> dict:
    """Fetch job offers based on the provided positions and locations."""
    offers = fetch_offers(
        desired_positions=state["positions"],
        locations=state["locations"],
        max_per_position=50,
    )

    state["job_offers"] = offers

    return {"job_offers": offers}


def map_score(state: JobsAgentState):
    """Dispatche chaque offre vers un nœud de scoring parallèle."""
    offers = state["job_offers"]

    if not offers:
        return []

    return [
        Send("score_single_offer", {
            "offer": asdict(offer),
            "profile": state["profile"],
            "llm": state["llm"]
        })
        for offer in offers
    ]


def score_single_offer(input: dict) -> dict:
    """Score une offre individuelle (appelé en parallèle).

    Args:
        input: Dict contenant offer, profile, llm

    Returns:
        Dict avec scored_offers (liste d'un seul élément)
    """
    offer = input["offer"]
    profile = input["profile"]
    llm = input["llm"]

    structured_llm = llm.with_structured_output(Scoring)

    scoring_prompt = f"""
Analyze the following job offer and candidate profile, and provide a match score and reason for the match.

Job Offer:
- Title: {offer.get('title')}
- Company: {offer.get('company_name')}
- Location: {offer.get('location')}
- Required skills: {offer.get('technical_tools', [])}
- Seniority: {offer.get('seniority_level')}
- Min experience: {offer.get('min_years_experience')} years
- Salary range: {offer.get('salary_min')}-{offer.get('salary_max')} {offer.get('salary_currency')}
- Workplace: {offer.get('workplace_type')}
- Industries: {offer.get('company_industries', [])}
- Summary: {offer.get('requirements_summary')}

Candidate Profile:
- Skills: {profile.get('skills', [])}
- Experience: {profile.get('years_of_experience') or 'Not specified'} years
- Industries: {profile.get('industries', [])}
- Workplace preference: {profile.get('workplace_preference', [])}
- Salary expectation: {profile.get('salary_min') or 'N/A'}-{profile.get('salary_max') or 'N/A'}

Provide a match score (0-100) and a clear, concise reason in French explaining why this offer matches or doesn't match the candidate's profile. Focus on key criteria: skills overlap, experience level, salary fit, workplace type, and industry alignment.
"""

    result = structured_llm.invoke(scoring_prompt)

    scored = {
        **offer,
        "match_score": result["match_score"],
        "match_reason": result.get("match_reason"),
    }

    return {"scored_offers": [scored]}


def reduce_scores(state: JobsAgentState) -> dict:
    """Filtre les offres sous le seuil de match.

    Args:
        state: State contenant scored_offers

    Returns:
        Dict avec scored_offers filtrées (score ≥ 40)
    """
    MATCH_THRESHOLD = 40

    kept = [
        offer for offer in state["scored_offers"]
        if offer["match_score"] >= MATCH_THRESHOLD
    ]

    return {"scored_offers": kept}


graph = StateGraph(JobsAgentState)

graph.add_node("fetch_data", fetch_data)
graph.add_node("score_single_offer", score_single_offer)
graph.add_node("reduce_scores", reduce_scores)

graph.add_edge(START, "fetch_data")
graph.add_conditional_edges(
    "fetch_data",
    map_score,
)
graph.add_edge("score_single_offer", "reduce_scores")
graph.add_edge("reduce_scores", END)

compiled_graph = graph.compile()