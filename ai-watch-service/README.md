# ai-watch-service

Service Python de la veille IA de DreamTrack. **Périmètre actuel : uniquement le fetch** — interroger
hiring.cafe directement (aucune clé API, aucun compte tiers) et normaliser sa sortie en `RawOffer`. La
pipeline de scoring (LangGraph) et l'endpoint HTTP `/run` sont hors périmètre (voir
`docs/superpowers/specs/ai_bench.md` à la racine du repo).

## Comment ça marche

Trois appels HTTP publics, sans authentification — les mêmes que ceux que le site utilise lui-même
pour sa recherche :

1. `GET https://hiringcafe.com/` → lit le `buildId` Next.js courant (change à chaque déploiement du
   site, donc relu à chaque run).
2. `GET https://hiringcafe.com/api/searchLocation?query=<ville>` → résout chaque ville voulue en objet
   structuré (autocomplétion publique).
3. `GET https://hiringcafe.com/_next/data/{buildId}/index.json?searchState=...` → renvoie les offres
   réelles (`ssrHits`).

**Un fetch par poste recherché** (`searchQuery` est une chaîne unique côté hiring.cafe — impossible d'y
mettre plusieurs postes en OR), chacun couvrant **toutes** les villes voulues en un seul appel
(`locations` est un tableau). Les résultats sont fusionnés et dédoublonnés sur `(source, external_id)`.

Tout est encapsulé dans `HiringCafeClient` (`fetch.py`) — la « porte de sortie » si ce mécanisme
change : seule cette classe évolue, pas le reste de la pipeline.

## Installation

```bash
cd ai-watch-service
uv sync
```

## Tests (aucun appel réseau)

```bash
uv run pytest
uv run ruff check
```

## Lancer un vrai run (gratuit — aucune clé requise)

```bash
uv run python -m ai_watch --positions "Data Scientist" --locations "Paris" --max-per-position 15
```

Plusieurs postes (un fetch par poste, fusionné et dédoublonné) :

```bash
uv run python -m ai_watch --positions "Data Scientist" --positions "Machine Learning Engineer" \
  --locations "Paris" --locations "Lyon" --output output/offers.json
```

Pour capturer le dataset brut (1er poste + villes) dans un fichier :

```bash
uv run python -m ai_watch --positions "Data Scientist" --locations "Paris" \
  --capture output/hiringcafe_hits.json
```
