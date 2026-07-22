"""Récupération des offres hiring.cafe via sa route de données interne.

Aucune clé API, aucun secret : on interroge les mêmes endpoints publics que le
site utilise lui-même pour sa recherche (voir `docs/superpowers/specs/ai_bench.md`
pour le détail du mécanisme et des mesures qui l'ont validé).
"""

from __future__ import annotations

import json
import logging
import re
from urllib.parse import urlencode

import httpx

from .offer import MalformedOfferError, RawOffer, normalize

BASE_URL = "https://hiringcafe.com"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)
BUILD_ID_RE = re.compile(r'"buildId":"([^"]+)"')

logger = logging.getLogger(__name__)


def build_search_state(
    search_query: str,
    locations: list[dict],
    *,
    workplace_types: list[str] = (),
    seniority_levels: list[str] = (),
    commitment_types: list[str] = (),
) -> dict:
    """Construit le `searchState` envoyé à la route de données. Fonction pure.

    `search_query` est une chaîne unique côté hiring.cafe, pas un OR de plusieurs
    postes (mesuré : concaténer deux postes réduit drastiquement les résultats) —
    d'où un appel par poste. `locations` est un tableau : toutes les villes voulues
    tiennent dans un seul appel.
    """
    search_state: dict = {"searchQuery": search_query}
    if locations:
        search_state["locations"] = locations
    if workplace_types := list(workplace_types):
        search_state["workplaceTypes"] = workplace_types
    if seniority_levels := list(seniority_levels):
        search_state["seniorityLevel"] = seniority_levels
    if commitment_types := list(commitment_types):
        search_state["commitmentTypes"] = commitment_types
    return search_state


class HiringCafeClient:
    """Encapsule les 3 appels HTTP nécessaires — la « porte de sortie » de la spec :
    si ce mécanisme casse, seule cette classe change, pas le reste de la pipeline."""

    def __init__(self, http_client: httpx.Client | None = None):
        self._http = http_client or httpx.Client(
            base_url=BASE_URL,
            headers={"User-Agent": USER_AGENT, "Referer": f"{BASE_URL}/"},
            timeout=30.0,
        )

    def build_id(self) -> str:
        """Lit le `buildId` Next.js courant depuis la page d'accueil.
        Change à chaque déploiement de hiring.cafe — à relire à chaque run."""
        response = self._http.get("/")
        response.raise_for_status()
        match = BUILD_ID_RE.search(response.text)
        if not match:
            raise RuntimeError("could not find Next.js buildId on hiring.cafe homepage")
        return match.group(1)

    def resolve_location(self, query: str) -> dict | None:
        """Résout une ville en objet `placeDetail` via l'autocomplétion publique.
        `None` si aucun résultat (ville ignorée, jamais fatale)."""
        response = self._http.get("/api/searchLocation", params={"query": query})
        response.raise_for_status()
        results = response.json()
        if not results:
            return None
        # The endpoint's own ranking is not population-based: a bare city name like
        # "Paris" ranks small same-named US towns (pop. ~25k) above the real Paris,
        # FR (pop. ~2.1M) — measured. Picking the most populous candidate reliably
        # resolves the intended major city instead of trusting result order.
        candidates = [r["placeDetail"] for r in results]
        return max(candidates, key=lambda place: place.get("population") or 0)

    def search(self, build_id: str, search_state: dict) -> list[dict]:
        """Interroge la route de données Next.js (celle que le site utilise pour
        la recherche côté client) et renvoie les `ssrHits` bruts."""
        query = urlencode({"searchState": json.dumps(search_state)})
        response = self._http.get(f"/_next/data/{build_id}/index.json?{query}")
        response.raise_for_status()
        return response.json()["pageProps"]["ssrHits"]


def fetch_offers(
    desired_positions: list[str],
    *,
    locations: list[str] = (),
    workplace_types: list[str] = (),
    seniority_levels: list[str] = (),
    commitment_types: list[str] = (),
    max_per_position: int = 15,
    client: HiringCafeClient | None = None,
) -> list[RawOffer]:
    """Un fetch par poste recherché (chacun couvrant déjà toutes les villes),
    tronqué à `max_per_position`, fusionné et dédoublonné sur `(source, external_id)`
    — un même poste peut légitimement matcher plusieurs postes recherchés.
    """
    client = client or HiringCafeClient()

    resolved_locations = []
    for location in locations:
        place = client.resolve_location(location)
        if place is None:
            logger.warning("no match for location %r — skipping", location)
            continue
        resolved_locations.append(place)

    build_id = client.build_id()

    offers_by_identity: dict[tuple[str, str], RawOffer] = {}
    for position in desired_positions:
        search_state = build_search_state(
            position,
            resolved_locations,
            workplace_types=workplace_types,
            seniority_levels=seniority_levels,
            commitment_types=commitment_types,
        )
        hits = client.search(build_id, search_state)[:max_per_position]
        for hit in hits:
            try:
                offer = normalize(hit)
            except MalformedOfferError as error:
                logger.warning("skipping malformed offer: %s", error)
                continue
            offers_by_identity[offer.identity] = offer

    return list(offers_by_identity.values())
