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

**Endpoint d'ingestion de documents** : `POST /documents/upload`

Parse un PDF (CV, lettre de motivation), le découpe en chunks (~1000 caractères, overlap
200), génère les embeddings (OpenAI `text-embedding-3-small`, clé fournie par requête) et
les indexe dans la collection Chroma de l'utilisateur (`user_<userId>`, stockage local
persistant — pas de service Chroma séparé). Un lot ultérieur ajoutera récupération et
génération de lettre à partir de ces documents.

Requête `multipart/form-data` (pas de JSON — nécessaire pour l'upload de fichier) :

| Champ    | Type    | Description                                                    |
| -------- | ------- | -------------------------------------------------------------- |
| `userId` | texte   | Identifiant utilisateur — détermine la collection Chroma cible |
| `kind`   | texte   | `cv` \| `cover_letter` \| `other`                              |
| `apiKey` | texte   | Clé API OpenAI (embeddings uniquement)                         |
| `file`   | fichier | PDF, 10 Mo max                                                 |

Exemple (curl) :

```bash
curl -X POST http://127.0.0.1:8008/documents/upload \
  -F "userId=user-123" \
  -F "kind=cv" \
  -F "apiKey=sk-..." \
  -F "file=@cv.pdf;type=application/pdf"
```

Réponse :

```json
{
  "documentId": "3f2c1b7a-...",
  "userId": "user-123",
  "kind": "cv",
  "chunkCount": 6,
  "collectionName": "user_user-123"
}
```

Stockage vectoriel : `.chroma-data/` (gitignoré) contient la base Chroma embarquée en local ;
en production ce chemin est un volume Docker nommé (`ai-watch-chroma-data`, voir
`docker-compose.yml`), configurable via la variable d'environnement
`CHROMA_PERSIST_DIRECTORY`. Aucun service de base de données séparé à lancer.

**Endpoint de génération de lettre de motivation** : `POST /generate-letter`

Pipeline LangGraph à deux nœuds : récupération (interroge la collection Chroma de
l'utilisateur — chunks factuels `cv`/`other` et chunks de style `cover_letter`, en deux
requêtes séparées) puis génération (LLM à sortie structurée, ancré uniquement sur les faits
retrouvés). Si aucun document n'est indexé pour l'utilisateur, échoue explicitement avant
d'appeler le LLM plutôt que de générer une lettre à vide.

Requête JSON :

```json
{
  "userId": "user-123",
  "apiKey": "sk-...",
  "provider": "openai",
  "model": null,
  "offer": {
    "company": "SUEZ",
    "role": "Senior Data Scientist",
    "description": "Nous recherchons..."
  },
  "profile": {
    "desiredPositions": ["Data Scientist", "ML Engineer"],
    "skills": ["Python", "TensorFlow"],
    "industries": ["Tech"],
    "workplacePreference": ["Remote"],
    "yearsOfExperience": 5,
    "salaryMin": 50000,
    "salaryMax": 80000
  },
  "tone": "formal"
}
```

Réponse :

```json
{
  "paragraphs": [
    "Madame, Monsieur,",
    "Fort de 5 années d'expérience en Data Science...",
    "..."
  ],
  "usedFacts": [
    "5 ans d'expérience en Machine Learning chez...",
    "Maîtrise de TensorFlow et Python..."
  ],
  "insufficientContext": false
}
```

Note : la clé fournie (`apiKey`) sert à la fois pour le LLM de génération et pour les
embeddings de retrieval (`text-embedding-3-small`, OpenAI) — seul le provider `openai` peut
fournir les deux avec la même clé pour l'instant.

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
