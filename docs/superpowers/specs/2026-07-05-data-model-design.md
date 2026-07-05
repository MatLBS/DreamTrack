# Design — Modèle de données (backend)

Date : 2026-07-05
Statut : validé

## Contexte

Outil de suivi de candidatures : un **Kanban** dont chaque colonne est aussi un **nœud**
d'un **diagramme de Sankey**. Le Sankey agrège l'historique des déplacements de cartes
entre colonnes (flux entre chaque paire de colonnes) et se régénère à chaque déplacement
ou création de colonne.

Périmètre de cette spec : **backend uniquement** — Drizzle + SQLite, schéma des tables,
première migration. Pas d'auth (Better Auth introduit plus tard). **Mono-utilisateur,
un seul tableau** : pas de table `user` ni `board` pour l'instant (YAGNI).

## Modèle mental validé

- **1 nœud du Sankey = 1 colonne du Kanban.** Le branchement du Sankey
  (`Jobs applied to → Replies / Rejections / No reply`) émerge naturellement de
  l'historique des transitions, pas d'une structure de graphe stockée.
- **6 colonnes par défaut, protégées (non-supprimables)**, dans cet ordre :
  `Jobs applied to` → `Replies` → `Rejections` → `No reply` → `Accepted` → `Rejected`.
- L'utilisateur peut **insérer de nouvelles colonnes entre** les colonnes par défaut
  (jamais avant la première ni après les dernières). Créer une colonne = un nouveau nœud.
- Le Sankey se dérive **des transitions**, pas de l'état courant des colonnes.

## Tables

### `columns`

| champ        | type                   | contraintes              | note                                                            |
| ------------ | ---------------------- | ------------------------ | --------------------------------------------------------------- |
| `id`         | text (uuid)            | PK                       |                                                                 |
| `name`       | text                   | NOT NULL                 | renommable                                                      |
| `position`   | integer                | NOT NULL                 | ordre dans le Kanban ; **géré serveur**, réindexé à l'insertion |
| `is_default` | integer (bool)         | NOT NULL, défaut `false` | protégée : suppression **interdite** (renommage/déplacement OK) |
| `created_at` | integer (timestamp ms) | NOT NULL                 |                                                                 |

- Règle « insérer uniquement entre les colonnes par défaut » → **couche service**, pas le schéma.
- Les 6 colonnes par défaut sont **seedées** à l'initialisation (voir Seed).

### `applications` (cartes)

| champ        | type                   | contraintes                                      | note                                                     |
| ------------ | ---------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| `id`         | text (uuid)            | PK                                               |                                                          |
| `company`    | text                   | NOT NULL                                         | entreprise                                               |
| `role`       | text                   | NOT NULL                                         | poste (`role` car `position` sert à l'ordre)             |
| `url`        | text                   | NULL                                             | lien de l'offre (optionnel)                              |
| `notes`      | text                   | NULL                                             | notes (optionnel)                                        |
| `column_id`  | text                   | NOT NULL, FK → `columns.id` `ON DELETE RESTRICT` | colonne **actuelle**                                     |
| `position`   | integer                | NOT NULL                                         | ordre de la carte **dans** sa colonne ; **géré serveur** |
| `created_at` | integer (timestamp ms) | NOT NULL                                         | date de création                                         |
| `updated_at` | integer (timestamp ms) | NOT NULL                                         | maj à chaque déplacement                                 |

- `position`, `created_at`, `updated_at` ne sont **jamais** dans le `InputSchema` HTTP —
  calculés/mis à jour par le service.
- Nouvelle carte → déposée par défaut dans `Jobs applied to`.
- `ON DELETE RESTRICT` sur `column_id` : cohérent avec « pas de suppression d'une colonne
  contenant des cartes » (et les colonnes par défaut ne sont de toute façon pas supprimables).

### `transitions` (source de vérité du Sankey)

| champ            | type                   | contraintes                                          | note                           |
| ---------------- | ---------------------- | ---------------------------------------------------- | ------------------------------ |
| `id`             | text (uuid)            | PK                                                   |                                |
| `application_id` | text                   | NOT NULL, FK → `applications.id` `ON DELETE CASCADE` |                                |
| `from_column_id` | text                   | **NULL**, FK → `columns.id`                          | `NULL` = événement de création |
| `to_column_id`   | text                   | NOT NULL, FK → `columns.id`                          | colonne d'arrivée              |
| `created_at`     | integer (timestamp ms) | NOT NULL                                             | quand le mouvement a eu lieu   |

Comportement :

- **Création** d'une carte dans `Jobs applied to` → 1 ligne `(from=NULL, to=Jobs applied to)`.
- **Déplacement** `Replies → Initial interviews` → 1 ligne `(from=Replies, to=Initial interviews)`.
- On conserve **tout l'historique** : une carte passée par `Entretien` puis `Refusée` compte
  durablement le flux `Entretien→Refusée`, même si elle rebouge ensuite.
- `ON DELETE CASCADE` : supprimer une carte efface ses transitions (le Sankey « oublie »
  son parcours).

Agrégation Sankey (dérivée, pas stockée) :

```sql
SELECT from_column_id, to_column_id, COUNT(*) AS value
FROM transitions
WHERE from_column_id IS NOT NULL
GROUP BY from_column_id, to_column_id;
```

Les événements de création (`from=NULL`) comptent les entrées / le total du nœud de départ
sans produire de lien.

## Seed (initialisation)

Insérer les 6 colonnes par défaut, `is_default = true`, `position` de 0 à 5 :

0. `Jobs applied to`
1. `Replies`
2. `Rejections`
3. `No reply`
4. `Accepted`
5. `Rejected`

## Hors périmètre de la migration (à traiter plus tard)

- **Cycles Sankey** : d3-sankey exige un graphe **acyclique**. Si les retours en arrière
  (`Accepted → Replies`) sont autorisés, prévoir une stratégie côté rendu. N'affecte pas le schéma.
- **Contrainte « insérer entre les défauts »** : logique métier de la couche service.
- **Auth / multi-utilisateur / multi-tableaux** : Better Auth + tables `user`/`board` plus tard.

## Choix techniques

- **Drizzle ORM** + **@libsql/client** (driver libSQL, N-API — agnostique à la version de
  Node, compatible Turso en prod).
- **drizzle-kit** pour générer / appliquer les migrations (`drizzle-kit generate` / `migrate`).
- Types : `text` pour les uuid (générés applicativement), `integer` avec mode timestamp
  pour les dates, `integer` mode boolean pour `is_default`.
- Fichiers : `src/db/schema.ts` (schéma), `src/db/index.ts` (client), `drizzle.config.ts`,
  migrations dans `drizzle/`.
