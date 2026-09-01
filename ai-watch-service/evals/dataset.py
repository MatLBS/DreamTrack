"""Pousse le golden dataset (evals/dataset.json) vers LangSmith.

Un exemple LangSmith = une paire (offre, profil) avec son score attendu,
annoté à la main dans dataset.json. Les `inputs` reprennent la forme
consommée par `score_single_offer` (offer, profile) pour que le futur
target function de la couche d'évaluation puisse les passer telles quelles.

Idempotent : relancer ce script met à jour le dataset existant au lieu
d'en créer un doublon.
"""

import json
from pathlib import Path

from dotenv import load_dotenv
from langsmith import Client

load_dotenv(Path(__file__).parent.parent / ".env")

DATASET_PATH = "./dataset.json"
DATASET_NAME = "dreamtrack-ai-watch-scoring"


def load_examples() -> list[dict]:
    """Construit les exemples (inputs/outputs) à partir de dataset.json."""
    with open(DATASET_PATH, "r") as f:
        data = json.load(f)

    offers_by_id = {offer["id"]: offer["offer"] for offer in data["offers"]}
    profiles_by_id = {name: p["profile"] for name, p in data["profiles"].items()}

    examples = []
    for offer_id, per_profile in data["annotations"].items():
        for profile_id, annotation in per_profile.items():
            examples.append(
                {
                    "inputs": {
                        "offer": offers_by_id[offer_id],
                        "profile": profiles_by_id[profile_id],
                    },
                    "outputs": {
                        "expected_score": annotation["expected_score"],
                    },
                    "metadata": {
                        "offer_id": offer_id,
                        "profile_id": profile_id,
                    },
                }
            )
    return examples


def sync_dataset(client: Client, examples: list[dict]) -> None:
    """Crée le dataset LangSmith s'il n'existe pas, sinon remplace ses exemples."""
    if client.has_dataset(dataset_name=DATASET_NAME):
        dataset = client.read_dataset(dataset_name=DATASET_NAME)
        for example in client.list_examples(dataset_id=dataset.id):
            client.delete_example(example_id=example.id)
    else:
        dataset = client.create_dataset(
            DATASET_NAME,
            description="Golden dataset pour l'évaluation offline du scoring AI Watch "
            "(score_single_offer) : 8 offres réelles figées x 2 profils contrastés.",
        )

    client.create_examples(dataset_id=dataset.id, examples=examples)


def main() -> None:
    client = Client()
    examples = load_examples()
    sync_dataset(client, examples)
    print(f"{len(examples)} exemples synchronisés dans le dataset '{DATASET_NAME}'.")


if __name__ == "__main__":
    main()
