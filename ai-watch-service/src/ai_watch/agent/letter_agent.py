"""Pipeline LangGraph de génération de lettre de motivation par RAG.

Deux nœuds : retrieval (interroge la collection Chroma de l'utilisateur) puis génération
(LLM à sortie structurée, ancrée sur les faits retrouvés — jamais d'invention).
"""

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langgraph.graph import END, START, StateGraph

from ai_watch.agent.letter_schema import LetterAgentState, LetterOutput
from ai_watch.documents import safe_collection_name

FACTS_TOP_K = 8
STYLE_TOP_K = 3


class NoIndexedDocumentsError(ValueError):
    """Aucun chunk cv/other trouvé pour cet utilisateur — pas de génération à vide."""


def retrieve_context(state: LetterAgentState) -> dict:
    """Interroge la collection Chroma de l'utilisateur : chunks factuels (cv/other) et
    chunks de style (cover_letter), en deux requêtes séparées — les lettres passées ne
    servent que de référence de ton, jamais de source de faits."""
    offer = state["offer"]
    query = f"{offer['role']} chez {offer['company']}. {offer.get('description') or ''}"

    embeddings = OpenAIEmbeddings(api_key=state["embeddings_api_key"], model="text-embedding-3-small")
    store = Chroma(
        collection_name=safe_collection_name(state["user_id"]),
        embedding_function=embeddings,
        persist_directory=state["persist_directory"],
    )

    fact_docs = store.similarity_search(query, k=FACTS_TOP_K, filter={"kind": {"$in": ["cv", "other"]}})
    if not fact_docs:
        raise NoIndexedDocumentsError("no indexed CV/documents found for this user")

    style_docs = store.similarity_search(query, k=STYLE_TOP_K, filter={"kind": "cover_letter"})

    return {
        "fact_chunks": [{"text": d.page_content, "kind": d.metadata["kind"]} for d in fact_docs],
        "style_chunks": [{"text": d.page_content, "kind": d.metadata["kind"]} for d in style_docs],
    }


def generate_letter(state: LetterAgentState) -> dict:
    """Génère la lettre à partir du contexte récupéré, sortie structurée."""
    llm = state["llm"]
    structured_llm = llm.with_structured_output(LetterOutput)

    offer = state["offer"]
    profile = state["profile"]
    facts = "\n\n".join(c["text"] for c in state["fact_chunks"])
    style_reference = "\n\n".join(c["text"] for c in state["style_chunks"]) or "Aucune référence de style disponible."

    prompt = f"""
Tu rédiges une lettre de motivation pour la candidature suivante. Utilise UNIQUEMENT les faits
fournis ci-dessous — n'invente jamais une expérience, une compétence ou un résultat qui n'y
figure pas. Si les faits fournis ne permettent pas de répondre correctement à l'offre, renvoie
insufficient_context=true plutôt que d'inventer.

Offre :
- Poste : {offer['role']}
- Entreprise : {offer['company']}
- Description : {offer.get('description') or 'Non fournie'}

Profil candidat :
- Postes visés : {profile.get('desired_positions', [])}
- Compétences : {profile.get('skills', [])}
- Expérience : {profile.get('years_of_experience') or 'Non spécifiée'} ans
- Industries : {profile.get('industries', [])}
- Préférence lieu de travail : {profile.get('workplace_preference', [])}

Ton souhaité : {state['tone']}

Faits extraits du CV (matière factuelle — seule source autorisée pour le contenu) :
{facts}

Référence de ton (anciennes lettres de motivation, style uniquement — jamais une source de faits) :
{style_reference}

Rédige la lettre sous forme de liste de paragraphes (pas un bloc unique). Renvoie aussi la
liste des extraits de faits effectivement utilisés (used_facts), et insufficient_context=true
si les faits disponibles ne suffisent pas à écrire une lettre pertinente pour cette offre.
"""

    result = structured_llm.invoke(prompt)
    return {"letter": result}


graph = StateGraph(LetterAgentState)
graph.add_node("retrieve_context", retrieve_context)
graph.add_node("generate_letter", generate_letter)

graph.add_edge(START, "retrieve_context")
graph.add_edge("retrieve_context", "generate_letter")
graph.add_edge("generate_letter", END)

compiled_letter_graph = graph.compile()
