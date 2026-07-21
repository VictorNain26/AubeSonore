# Design — « La Scène » : page live en écran unique

Date : 2026-07-21. Validé avec Victor (brainstorming session du jour). Remplace la composition de `2026-07-20-live-page-design.md` (dont l'identité était pré-v3) ; s'appuie sur le design system v3 (`2026-07-20-design-system-v3-design.md`), désormais seul et sans legacy (PR #117–#121).

**Hiérarchie produit inchangée** : 1. écouter le direct, 2. découvrir, 3. partager, 4. réécouter. Tout élément qui ne sert pas un de ces usages est retiré.

## Principes actés

- **Écran unique, player central** : la page tient dans le viewport, sans scroll, desktop comme mobile. Le player est la scène ; le reste est périphérie.
- **Aucun libellé « en direct »** : le live est induit par le médium (webradio). Ni badge, ni filet, ni « depuis Xmin », ni compteur. Le signal vivant est l'onde en mouvement pendant la lecture.
- **Aucune invite textuelle de lecture** : « Appuyez sur lecture pour écouter le direct » disparaît. À l'arrêt, l'onde plate est l'état d'attente ; le play superposé à la pochette est l'affordance. L'information reste portée par l'`aria-label` du bouton play.
- **« Hors antenne » est la seule exception textuelle** : quand le flux est réellement indisponible, le message remplace la zone onde (vraie information, pas narration).

## Structure (desktop ≥ lg)

```
header  : AubeSonore                    ◑ ⓘ ⌸ [Connexion]
scène   :        ┌──────────┐   TITRE (text-display)
(centrée         │ pochette │   artiste (text-lead, ouvre le panneau)
 verticalement)  │      [▶] │   ♡ ⤴ ⋯vol⋯ ▤   ≈≈≈≈≈≈≈ (onde)
                 └──────────┘   bio clampée 2 lignes (text-text-faint)
bandeau : VIENT DE PASSER
          [□] Titre — Artiste 13:56 · [□] Titre — Artiste 13:54 · … ‹›
```

- **Header** : marque + actions existantes (thème, à propos, bibliothèque, connexion). Rien d'autre.
- **Scène** : pochette et bloc texte côte à côte, centrés dans l'espace entre header et bandeau (flex column, `justify-center` sur la hauteur restante). Un seul objet visuel.
  - **Play superposé** au coin bas-droit de la pochette : cible ronde accent ≥ 56 px, seul aplat accent de la page. `aria-label` « Écouter le direct » / « Couper le son » selon l'état.
  - **Titre** `text-display`, **artiste** `text-lead` cliquable (panneau artiste existant).
  - **Ligne d'actions** : like ♡, partage ⤴, puis satellites volume et AirPlay en retrait (`text-text-faint`). Tous ≥ 44 px.
  - **Onde** calée sur la largeur du bloc texte, jamais pleine largeur. Comportement inchangé (ligne d'encre, reduced-motion la fige).
  - **Bio** : 2 lignes clampées sous l'onde, desktop uniquement ; le panneau artiste reste l'accès complet (mobile inclus).
- **Bandeau « Vient de passer »** : collé en bas, séparé par `border-t border-border`.
  - Eyebrow `text-caption tracking-widest uppercase text-text-faint`.
  - Rail horizontal : les 6 derniers morceaux **en excluant le morceau en cours** (le direct est la scène, le bandeau est le passé). Item = mini-pochette 40 px (`rounded-sm`, placeholder `bg-surface-raised`) + titre/artiste tronqués + heure `tabular-nums`.
  - Défilement natif + `scroll-snap-type: x proximity`, molette/swipe. Pas de flèches custom (YAGNI ; le scroll natif suffit).
  - Like/partage par item : visibles au hover/focus-visible (desktop), toujours accessibles au clavier ; en tactile l'item entier reste ≥ 44 px et les actions sont visibles en permanence sous `(hover: none)`.

## Mobile (< lg)

Même scène, empilée et centrée, zéro scroll vertical :

```
header   : AubeSonore              ◑ ⓘ ⌸ →]
scène    :        ┌──────────┐
(flex-1,          │ pochette │
 centrée)         │      [▶] │
                  └──────────┘
           TITRE
           artiste
           ♡ ⤴ ⋯vol⋯   ≈≈≈≈ (onde)
bandeau  : VIENT DE PASSER
           ‹ [□][□][□] › (swipe, safe-area-inset-bottom)
```

- La pochette se dimensionne en `min()` de la largeur disponible et de la hauteur restante (l'utility `artwork-size` évolue en conséquence) pour garantir le zéro-scroll sur 390×844 comme sur les petits viewports (~667 px de haut).
- Bio masquée (accessible via le panneau artiste).
- Le bandeau garde le rail swipable, `padding-bottom: env(safe-area-inset-bottom)`.
- Entre les breakpoints, l'empilement passe côte à côte à `lg`.

## Données

- Le morceau en cours est **exclu** du rail : filtrer l'historique sur `sh_id !== now_playing.sh_id` (vérifier le champ discriminant réel dans le store azuracast avant implémentation ; l'API AzuraCast expose `song_history` séparé du `now_playing` — si la source est déjà disjointe, le filtre est un garde-fou).
- Aucun nouvel appel API. Le fetch/elapsed d'`AntennaStatus` disparaît avec le composant si plus rien ne le consomme.

## Composants impactés

| Composant                        | Sort                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Player/index.tsx`               | Nouvelle structure scène (grid/flex), skeletons v3 recomposés à l'identique des nouvelles positions    |
| `TrackArtwork`                   | Reçoit le play superposé (composition avec `PlaybackControls`)                                         |
| `PlaybackControls`               | Devient le play rond accent ≥ 56 px sur la pochette                                                    |
| `TrackMeta`                      | Titre + artiste + ligne d'actions (like/share y restent)                                               |
| `WaveformCanvas`                 | Inchangé ; conteneur calé sur le bloc texte                                                            |
| `AntennaStatus`                  | Supprimé ; le cas « Hors antenne » migre dans la scène (`Antenna`)                                     |
| `VolumeControl`, `AirPlayButton` | Satellites de la ligne d'actions (inchangés fonctionnellement)                                         |
| `ArtistBio`                      | Devient la bio clampée desktop (le lien « En savoir plus » ouvre le panneau, inchangé)                 |
| `StationLog` + `StationLogRow`   | Remplacés par le bandeau `RecentTracks` (rail horizontal) — suppression des composants liste verticale |
| `layout/Layout.tsx`              | La grille page passe en `grid-rows-[auto_1fr_auto]` plein viewport (`100dvh`)                          |

## A11y & motion

- Le rail est `role="list"`/`role="listitem"`, focus visible sur chaque action, navigation clavier native (tab), `aria-label` du rail « Vient de passer ».
- Play : `aria-label` explicite (l'invite textuelle supprimée vit là).
- Cibles ≥ 44 px partout (play ≥ 56 px).
- Aucune nouvelle animation ; entrée de page et onde existantes conservées ; `prefers-reduced-motion` inchangé.
- Contraste : aucun nouveau couple de tokens ; `check-contrast.mjs` inchangé.

## Non-objectifs

- Pas de nouveau token ni de nouvelle primitive `design/ui/` (le rail est un composant applicatif).
- Pas de refonte des modales, du header (contenu identique), ni du mobile Expo.
- Pas de virtualisation du rail (6 items).
- Pas de flèches/pagination custom sur le rail.

## Validation

Boucle habituelle : dev server → 4 captures CDP (clair/sombre × 1280×800 / 390×844) critiquées contre cette spec → gates (`typecheck`, `lint` zéro warning, `test --run --coverage`, `build`, `check-contrast`) → revue adversariale → PR courte auto-merge. Vérifier explicitement : zéro scroll aux deux viewports, morceau en cours absent du rail, aucune occurrence des textes supprimés (« En direct », « Appuyez sur lecture »).
