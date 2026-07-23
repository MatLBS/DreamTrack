# ai-watch-service

Service Python de la veille IA de DreamTrack. Interroge hiring.cafe directement (aucune clé API, aucun
compte tiers), normalise les offres, puis les score via LangGraph avec un LLM (Anthropic ou OpenAI,
provider dynamique). Exposé via FastAPI pour intégration avec le scheduler Node.js.

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

## Commandes

### Serveur HTTP (production)

Démarre le serveur FastAPI écoutant sur `http://127.0.0.1:8000` :

```bash
uv run python -m ai_watch serve --host 127.0.0.1 --port 8000
```

En mode développement avec auto-reload :

```bash
uv run python -m ai_watch serve --reload
```

**Endpoint principal** : `POST /run`

Exemple de requête (depuis TypeScript) :

```json
{
  "userId": "user-123",
  "profile": {
    "desiredPositions": ["Data Scientist", "ML Engineer"],
    "locations": ["Paris", "Lyon"],
    "skills": ["Python", "TensorFlow"],
    "industries": ["Tech"],
    "workplacePreference": ["Remote"],
    "yearsOfExperience": 5,
    "salaryMin": 50000,
    "salaryMax": 80000
  },
  "provider": "anthropic",
  "apiKey": "sk-ant-..."
}
```

Réponse : liste d'offres scorées (score ≥ 50 seulement) :

```json
{
  "offers": [
    {
      "source": "greenhouse",
      "externalId": "12345",
      "company": "SUEZ",
      "role": "Senior Data Scientist",
      "url": "https://...",
      "location": "Paris, FR",
      "description": "...",
      "matchScore": 85,
      "matchReason": "5/5 compétences, XP suffisante, salaire dans la fourchette"
    }
  ]
}
```

### CLI de test (fetch uniquement, sans scoring)

```bash
uv run python -m ai_watch fetch --positions "Data Scientist" --locations "Paris" --max-per-position 15
```

Plusieurs postes (un fetch par poste, fusionné et dédoublonné) :

```bash
uv run python -m ai_watch fetch --positions "Data Scientist" --positions "Machine Learning Engineer" \
  --locations "Paris" --locations "Lyon" --output output/offers.json
```

Pour capturer le dataset brut (1er poste + villes) dans un fichier :

```bash
uv run python -m ai_watch fetch --positions "Data Scientist" --locations "Paris" \
  --capture output/hiringcafe_hits.json
```
