import argparse
import os
from pathlib import Path
from typing import TypedDict

from dotenv import load_dotenv
from langsmith import Client

from openevals.llm import create_llm_as_judge

from ai_watch.agent.agent import create_llm, score_single_offer, resolve_evaluation_model

load_dotenv(Path(__file__).parent.parent / ".env")

DATASET_NAME = "dreamtrack-ai-watch-scoring"

PROVIDER_ENV_VARS = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
}

REASON_JUDGE_PROMPT = """You are auditing the output of a job-offer scoring pipeline.
Given a job offer, a candidate profile, a match score (0-100), and a short
reason explaining that score, judge the reason against three criteria.

<Criteria>
  - score_consistent: the reason's judgment (positive/negative/mixed) matches
    the direction of match_score. A high score (>=60) with a mostly negative
    reason, or a low score (<40) with a mostly positive reason, is inconsistent.
  - grounded_in_facts: every concrete claim in the reason (skills, seniority,
    salary, location, industry, etc.) is actually present in the job offer or
    candidate profile below — no invented requirements or invented candidate
    attributes.
  - is_french: the reason is written in French, as required by the pipeline's
    prompt.
</Criteria>

<JobOffer>
{inputs}
</JobOffer>

<PipelineOutput>
{outputs}
</PipelineOutput>
"""


class ReasonJudgement(TypedDict):
    score_consistent: bool
    grounded_in_facts: bool
    is_french: bool
    explanation: str


def make_target(provider: str, api_key: str, model: str | None):
    """Construit la target function passée à client.evaluate().

    Le LLM est créé une seule fois ici (pas par exemple évalué) puisque
    score_single_offer le reçoit déjà instancié — cohérent avec la façon
    dont server.py l'injecte dans le state avant compiled_graph.invoke().
    """
    llm = create_llm(provider, api_key, model)

    def target(inputs: dict) -> dict:
        try:
            result = score_single_offer(
                {
                    "offer": inputs["offer"],
                    "profile": inputs["profile"],
                    "llm": llm,
                }
            )
            scored = result["scored_offers"][0]
            return {
                "match_score": scored["match_score"],
                "match_reason": scored.get("match_reason"),
            }
        except Exception:
            import traceback

            traceback.print_exc()
            raise

    return target


def make_reason_judge_evaluator(provider: str):
    """
    Juge match_reason sur 3 critères vérifiables (voir REASON_JUDGE_PROMPT).
    """
    model = resolve_evaluation_model(provider, None)

    judge = create_llm_as_judge(
        prompt=REASON_JUDGE_PROMPT,
        model=model,
        output_schema=ReasonJudgement,
    )

    def reason_judge_evaluator(inputs: dict, outputs: dict) -> list[dict]:
        judgement = judge(inputs=inputs, outputs=outputs)
        return [
            {
                "key": "reason_score_consistent",
                "score": judgement["score_consistent"],
                "comment": judgement["explanation"],
            },
            {"key": "reason_grounded_in_facts", "score": judgement["grounded_in_facts"]},
            {"key": "reason_is_french", "score": judgement["is_french"]},
        ]

    return reason_judge_evaluator


def score_error(outputs: dict, reference_outputs: dict) -> dict:
    """Écart absolu entre le score produit et le score annoté à la main."""
    expected = reference_outputs["expected_score"]
    actual = outputs["match_score"]
    return {
        "key": "score_error",
        "score": abs(actual - expected),
        "comment": f"expected={expected} actual={actual}",
    }


def structural_validity(outputs: dict) -> dict:
    """Le score est-il un entier exploitable dans [0, 100] ?

    N'utilise pas `reference_outputs` : c'est une propriété de la sortie
    seule, indépendante de ce qu'on attendait pour cet exemple précis.
    """
    score = outputs.get("match_score")
    valid = isinstance(score, int) and 0 <= score <= 100
    return {"key": "structural_validity", "score": 1 if valid else 0}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--provider",
        choices=["anthropic", "openai", "openrouter"],
        default="anthropic",
        help="Provider LLM à évaluer (défaut: anthropic).",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Modèle custom. Par défaut, le modèle de scoring par défaut du provider "
        "(voir DEFAULT_SCORING_MODELS dans agent.py).",
    )
    args = parser.parse_args()

    env_var = PROVIDER_ENV_VARS[args.provider]
    api_key = os.environ.get(env_var)
    if not api_key:
        raise SystemExit(f"{env_var} manquante dans ai-watch-service/.env")

    client = Client()
    target = make_target(args.provider, api_key, args.model)

    experiment_prefix = f"{args.provider}-{args.model or 'default'}"
    client.evaluate(
        target,
        data=DATASET_NAME,
        evaluators=[
            score_error,
            structural_validity,
            make_reason_judge_evaluator(args.provider),
        ],
        experiment_prefix=experiment_prefix,
    )


if __name__ == "__main__":
    main()
