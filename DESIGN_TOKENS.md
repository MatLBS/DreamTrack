# DreamTrack — Spec typographie & couleurs

Police unique : **Manrope** (Google Fonts, poids 400/500/600/700/800).

```html
<link
  href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
  rel="stylesheet"
/>
```

`font-family: 'Manrope', sans-serif;` partout, aucune autre police dans l'app.

## Couleurs

| Rôle                | Hex                                | Usage                                                                |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| Noir principal      | `#14161c`                          | fonds sombres, texte fort, boutons primaires                         |
| **Accent (tweak)**  | `#7F1734`                          | logo, CTA colonnes Kanban, flux Sankey "Acceptées", cercle nav actif |
| Fond app            | `#f7f7f8`                          | fond de page derrière les cartes                                     |
| Fond neutre clair   | `#f2f2f4`                          | toggle inactif, chips, badge "Aperçu"                                |
| Fond très clair     | `#f7f7f8`                          | lignes de préférences (Profil), stats                                |
| Bordure standard    | `#e6e6ea`                          | cartes, inputs, séparateurs                                          |
| Bordure fine        | `#eceef0`                          | cartes de candidature (Kanban)                                       |
| Bordure très fine   | `#f0f0f2`                          | séparateurs de liste (paramètres)                                    |
| Texte secondaire    | `#6b6b76`                          | labels, sous-titres, entreprise                                      |
| Texte tertiaire     | `#9a9aa3`                          | placeholders, meta text                                              |
| Texte quaternaire   | `#b3b3ba`                          | timestamps, séparateur "ou"                                          |
| Texte désactivé     | `#c3c3ca`                          | icône ⋮, état vide                                                   |
| Avatar placeholder  | `#eee5cc`                          | rond avatar profil                                                   |
| Badge "Offre reçue" | `#8a6d1a` sur `transparent`        | texte "↗ Offre"                                                      |
| Badge match IA      | `#8a6d1a` sur `#faf3e2`            | pill "XX% match"                                                     |
| Fichier placeholder | `#f2f2f4` fond / `#e6e6ea` bordure | icône CV                                                             |

## Typographie — table complète (taille / graisse / couleur / usage)

| Taille | Graisse | Couleur                                       | Élément                                                                                       |
| ------ | ------- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 36px   | 800     | `#fff`                                        | Titre marketing (panneau gauche Login)                                                        |
| 22px   | 800     | `#14161c`                                     | Titres de page ("Profil", "Suivi de candidatures", "Veille active")                           |
| 20px   | 800     | `#fff`                                        | Logo "DreamTrack"                                                                             |
| 19px   | 800     | `#14161c`                                     | Valeur des stats (Profil)                                                                     |
| 16px   | 800     | `#14161c`                                     | Nom utilisateur (Profil)                                                                      |
| 15px   | 800     | `#14161c`                                     | Titre "Flux des candidatures"                                                                 |
| 14.5px | 800     | `#14161c`                                     | Titre carte suggestion (Veille IA)                                                            |
| 14.5px | 400     | `rgba(255,255,255,.55)`                       | Sous-titre marketing (Login)                                                                  |
| 14px   | 700     | `#fff`                                        | Texte bouton principal (Se connecter)                                                         |
| 13.5px | 700     | `#14161c`                                     | Titre colonne Kanban                                                                          |
| 13.5px | 400     | `#9a9aa3` / `#3a3a42`                         | Champs de formulaire (placeholder), bouton Google                                             |
| 13px   | 700     | `#14161c` / `#fff`                            | Onglets toggle, poste (carte Kanban), texte SVG Sankey                                        |
| 13px   | 400     | `#6b6b76` / `#3a3a42`                         | Lien bascule login/signup, lignes préférences/paramètres                                      |
| 12.5px | 700     | `#14161c`                                     | Bouton "Modifier"                                                                             |
| 12.5px | 400     | `#6b6b76`                                     | Email (Profil)                                                                                |
| 12px   | 800     | `#8a6d1a` / `#fff`                            | Badge match IA, bouton "+ Ajouter au kanban"                                                  |
| 12px   | 700     | `#14161c`                                     | Lien "Remplacer"                                                                              |
| 12px   | 400     | `#6b6b76` / `#9a9aa3` / `#b3b3ba` / `#c3c3ca` | Sous-texte suggestion IA, entreprise (carte Kanban), séparateur, état vide, sous-titre Sankey |
| 11.5px | 400     | `#9a9aa3`                                     | Date de mise à jour CV                                                                        |
| 11px   | 700     | `#6b6b76`                                     | Labels majuscules (EMAIL, MOT DE PASSE, titres de section) — `letter-spacing: .3–.4px`        |
| 11px   | 600     | `#9a9aa3`                                     | Compteur "{n} candidatures" sous le titre de colonne                                          |
| 10.5px | 700     | `#6b6b76`                                     | Label stat (Profil), badge "Aperçu"                                                           |
| 10.5px | 400     | `#b3b3ba`                                     | Timestamp carte Kanban                                                                        |

## Rayons & ombres

- Boutons/inputs : `border-radius: 9px`
- Cartes : `border-radius: 12–14px`
- Chips/pills : `border-radius: 8px` ou `20px` (pill complet)
- Cercles (avatar, nav) : `border-radius: 50%`
- Ombre carte flottante/menu nav : `box-shadow: 0 8px 24px rgba(20,22,28,.28)`

## Fichier de référence

Voir `DreamTrack - 4 Pages HF.dc.html` à la racine du projet : les 4 pages y sont posées côte à côte avec ces valeurs exactes en `style` inline — à lire directement comme spec si besoin de vérifier un élément précis.
