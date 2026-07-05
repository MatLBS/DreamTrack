# Guide projet

## Le produit

Outil web de **suivi de candidatures** combinant :

1. Un **tableau Kanban** avec colonnes personnalisables (ajout, renommage, suppression,
   réordonnancement). Colonnes par défaut : `Repérée`, `Candidature envoyée`, `Entretien`,
   `Offre`, `Refusée`.
2. Un **diagramme de Sankey** qui se régénère en temps réel à chaque déplacement de carte,
   calculé en agrégeant **toutes les transitions** de toutes les cartes (compte des flux
   entre chaque paire de colonnes).

Une **carte** = une candidature : `entreprise`, `poste`, `lien de l'offre` (optionnel),
`notes` (optionnel), `date de création`. Le déplacement se fait en **drag & drop** (dnd-kit),
d'une colonne à une autre. Chaque déplacement est une **transition** enregistrée
(`fromColumn → toColumn`), source de vérité du Sankey.

## Stack

| Besoin              | Choix                         | Notes                                                                                       |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| Framework           | **Next.js 16 (App Router)**   | RSC par défaut, `"use client"` seulement quand nécessaire                                   |
| Langage             | **TypeScript** (strict)       |                                                                                             |
| ORM / DB            | **Drizzle**                   | SQLite/libSQL en local, Postgres possible en prod                                           |
| Validation          | **Zod**                       | schémas partagés ; suffixe `InputSchema` (HTTP) et `Schema` (domaine)                       |
| Server-state client | **TanStack Query**            | jamais de `useEffect` + `fetch` manuel pour du server-state                                 |
| Lecture serveur     | **RSC → service direct**      | pas de fetch client pour ce qui peut être lu côté serveur                                   |
| Forms               | **TanStack Form** (`useForm`) | jamais de state contrôlé à la main pour un formulaire                                       |
| Primitives UI       | **shadcn/ui**                 | ne jamais modifier les fichiers `ui/` générés ; composer par-dessus                         |
| Styling             | **Tailwind CSS v4**           | mobile-first                                                                                |
| Icônes              | **Lucide**                    | jamais de SVG inline                                                                        |
| Drag & drop         | **dnd-kit**                   | déplacement des cartes et réordonnancement des colonnes                                     |
| Sankey              | **d3-sankey** (+ d3)          | rendu SVG ; fallback implémentation maison si d3-sankey se révèle plus lourd que nécessaire |
| Dates               | **date-fns**                  | pas de moment.js                                                                            |
| Tests               | **Vitest** + Testing Library  |                                                                                             |

> Ne pas s'écarter de ces défauts sans une contrainte explicite du projet (et le dire alors).

## Architecture en couches

Séparation stricte, **dépendance à sens unique** : `queries → services → routes API / RSC`.
Une couche ne remonte **jamais** vers celle du dessus.

```
src/
  app/                      # App Router : pages (RSC) + routes API
    api/.../route.ts        # points d'entrée HTTP (mutations)
  db/
    schema.ts               # schéma Drizzle
    index.ts                # client Drizzle
  queries/                  # accès DB uniquement (Drizzle). Aucune logique métier.
  services/                 # logique métier + orchestration. Consomme les queries.
  lib/
    validation/             # schémas Zod (InputSchema + Schema domaine)
    sankey/                 # agrégation des transitions → nœuds/liens Sankey
  components/
    ui/                     # shadcn générés — NE PAS modifier
    kanban/                 # Kanban, colonnes, cartes (dnd-kit)
    sankey/                 # rendu du diagramme
```

- **queries/** : appels Drizzle. Rien d'autre.
- **services/** : logique métier. Valide au passage de frontière (Zod domaine), consomme les queries.
- **routes API / RSC** : consomment les services. Jamais une query directement.

**Flux lecture (RSC)** : `page.tsx → service → query → drizzle → db`
**Flux écriture (API)** : `client → route.ts → valide (Zod Input) → service → valide (Zod domaine) → query → drizzle → db`

## Conventions

- Fichiers domaine : `application.ts`, `column.ts` (le dossier donne le contexte, pas `applicationService.ts`).
- Types en **PascalCase**, constantes en **SCREAMING_SNAKE_CASE**, hooks préfixés **`use`**.
- `"use client"` uniquement sur les composants réellement interactifs (Kanban, Sankey, forms).
- Le Sankey se dérive **des transitions**, pas de l'état courant des colonnes : chaque
  déplacement écrit une ligne de transition. C'est ce qui permet de compter les flux.

## Sécurité (non-négociable)

- **Auth sur chaque route** de mutation (guard d'authentification). Pas de « route publique par oubli ».
- **Contrôle d'accès explicite** : vérifier que l'utilisateur possède _cette_ ressource, pas seulement qu'il est connecté.
- **Validation aux 2 frontières** : Zod à l'entrée HTTP (`InputSchema`) _et_ à la frontière domaine (`Schema`).
- **Secrets en `.env`**, jamais commités (vérifier `.gitignore`).
- **Audit log** sur les mutations sensibles.

> Auth : **Better Auth** quand le multi-utilisateur sera introduit. Tant que l'app est
> mono-utilisateur locale, garder les guards prêts à brancher (ne pas exposer de route non protégée).

## Qualité & Git

- Avant de conclure une tâche : `npx tsc --noEmit` + `npm run lint` doivent passer.
- Tester en priorité les **services** et la **logique d'agrégation Sankey** ; tests d'intégration sur les routes.
- Commits petits et ciblés, messages clairs. **PR en anglais**.
- **Jamais `git commit` / `git push` sans validation explicite.** Commit local possible sur demande, mais demander avant de push.

## Commandes

```bash
npm run dev     # serveur de dev
npm run build   # build de prod
npm run lint    # ESLint
npm run start   # serveur de prod
```

## Red flags — STOP

- `fetch` + `useEffect` pour du server-state → TanStack Query
- Formulaire avec `useState` à la main → TanStack Form
- Route API sans guard d'auth → l'ajouter
- Query appelée directement depuis une route (en sautant le service) → passer par le service
- SVG inline (hors rendu Sankey) → icône Lucide
- Sankey dérivé de l'état courant au lieu des transitions → utiliser les transitions
- `git push` non demandé → s'arrêter et demander
