# Design System v3 — Phase 1 : appairage typographique, rail « Vient de passer », amorce atomique

Date : 2026-07-21
Statut : validé (design), en attente de plan d'implémentation

## Contexte

Le rail « Vient de passer » (`RecentTracks` + `RecentTrackCard`) est trop écrasé :
tout est sur une ligne serrée (`py-1`), la scrollbar native est visible, et il n'y a
pas de défilement au drag souris. En parallèle, on veut (1) un choix de police assumé
plutôt que le défaut Inter partout, et (2) engager une réorganisation atomique du design
system entièrement documentée dans Storybook.

Ce spec couvre la **Phase 1**. La réorganisation atomique complète de l'arbre est un objectif
cible ; elle sera livrée **tranche par tranche** (une PR mergeable par tranche, cadence main-first).
Les phases suivantes auront chacune leur propre spec.

## Objectifs (Phase 1)

1. **Police** : introduire un appairage display/texte, sans nouvelle dépendance.
2. **Rail réparé** : `RecentTracks` en rail horizontal aéré, scrollbar masquée, drag-to-scroll,
   snap, via une lib maintenue (pas de code maison).
3. **Amorce atomique** : établir la taxonomie `atoms/molecules/organisms/foundations`, y migrer
   la couche design system existante, et décomposer le rail en composants atomiques.
4. **Storybook** : chaque atom / molecule / organism documenté, tous états × 2 thèmes, addon-a11y clean.

## Non-objectifs

- Migrer les composants applicatifs de `src/components/` (Player, modales) — phases ultérieures.
- Changer la logique de like / partage / historique (on la conserve, on la déplace).
- Toucher aux tokens de couleur (donc `check-contrast.mjs` reste inchangé).

## Partie A — Police : appairage Instrument Sans / Inter

Les deux polices variables sont **déjà installées** (`@fontsource-variable/inter`,
`@fontsource-variable/instrument-sans`) ; Instrument Sans n'était pas câblée.

- **Display + Title** (hero manchette, kicker « Vient de passer ») → **Instrument Sans**
  (grotesque à caractère, axe de chasse `wdth`, graisses 400–700). Voix éditoriale distinctive.
- **Body + UI + captions + horaires** → **Inter** (conservée). Meilleure en dense et en
  tabulaire (`tabular-nums` pour l'horloge), axe optique `opsz`.

Implémentation dans `src/design/tokens.css` :

```
--p-font-display: 'Instrument Sans Variable', 'Inter Variable', system-ui, sans-serif;
```

et dans `@theme inline` (namespace `--font-*`, qui génère l'utility `font-display`) :

```
--font-display: var(--p-font-display);
```

Application : Tailwind v4 **n'a pas** de companion `--text-*--font-family` (vérifié : seuls
`--line-height`, `--letter-spacing`, `--font-weight` existent). On applique donc l'utility
`font-display` sur les usages `text-display` et `text-title` (hero manchette, titres de section,
kicker « Vient de passer »). Les autres échelles restent en Inter via le `<body>`.
Ajout de `font-display` au vocabulaire autorisé dans `apps/frontend/CLAUDE.md`.

Câblage du chargement :

- `src/main.tsx` : ajouter `import '@fontsource-variable/instrument-sans';`.
- Storybook : importer les **deux** packages fontsource dans `.storybook/preview` (aujourd'hui
  `storybook.css` déclare `font-family` sans importer le package — la police n'est pas garantie en SB).

Aucun impact contraste (la police ne change pas les couleurs).

## Partie B — Rail « Vient de passer » via Embla Carousel

Lib retenue : **`embla-carousel-react` v8.6.0** + **`embla-carousel-a11y`** (plugin Accessibility officiel).
Justification : les libs drag-scroll dédiées (`react-use-draggable-scroll`, `react-indiana-drag-scroll`)
sont abandonnées (~4 ans, mouse-events). Embla est la référence maintenue (headless, pointer events,
socle du composant Carousel de shadcn/ui), dependency-free elle-même.

Configuration du rail (défilement libre, pas de pagination) :

```
useEmblaCarousel(
  { dragFree: true, align: 'start', containScroll: 'trimSnaps', dragThreshold: 10 },
  [Accessibility({ keyboardNavigation: true })]
)
```

- `dragFree: true` → défilement libre au drag (comportement « strip », pas slide-par-slide).
- `dragThreshold: 10` → distingue nativement un drag d'un clic ⇒ pas de like/partage parasite
  pendant un glissement.
- Plugin Accessibility → navigation clavier (flèches), ARIA live region, gestion du focus.
- Scrollbar masquée par construction (Embla utilise des transforms, pas de scroll natif).

Aération : cartes en `rounded-md bg-surface-raised`, padding vertical généreux (fini `py-1`),
pochette agrandie, `gap` entre cartes via tokens d'espacement. Curseur `grab`/`grabbing` sur le rail.
États hover/focus-visible/active/disabled des actions conservés (cibles ≥ 44px).

Réduction de mouvement : Embla anime le défilement au drag (interaction directe, pas décoratif).
Le drag reste actif sous `prefers-reduced-motion: reduce` ; on ne rajoute aucune animation décorative.

## Partie C — Taxonomie atomique et réorganisation des dossiers

Cible de la structure `src/design/` :

```
src/design/
  foundations/   ← Couleurs, Espacement, Onde, Typographie (stories déplacées)
  atoms/         ← ex-src/design/ui, reclassé
  molecules/
  organisms/
  tokens.css
  storybook.css
```

Réaffectation de l'existant `src/design/ui/` :

| Composant                       | Destination  | Raison                  |
| ------------------------------- | ------------ | ----------------------- |
| `Button`, `TextField`, `Slider` | `atoms/`     | primitives indivisibles |
| `Menu`                          | `molecules/` | composition d'items     |
| `Modal`                         | `organisms/` | conteneur structurant   |

Nouveaux composants Phase 1 :

**Atoms (`src/design/atoms/`)**

- `Thumbnail` — carré pochette + fallback icône `Music`, gère `imgError`. Props : `src?`, `alt`, `size`.
  (réutilisé ensuite par `TrackArtwork`.)
- `IconButton` — bouton action 44px (aujourd'hui dupliqué via `actionClassName` / `revealClassName`).
  Props : `icon`, `label` (aria), `onClick`, `disabled?`, `active?`, `reveal?` (opacity-0 → group-hover/focus-within).
- `Rail` — wrapper headless Embla. Props : `children`, `ariaLabel`. Encapsule `useEmblaCarousel`
  - plugin Accessibility, rend viewport/container, applique curseur `grab`.

**Molecule (`src/design/molecules/`)**

- `TrackRailItem` — carte présentationnelle **props-in** (aucun store). Props : `title`, `artist`,
  `art?`, `time` (formaté), `isLiked`, `isLiking`, `onToggle`, `onShare`. Compose `Thumbnail`
  - texte + `<time>` + deux `IconButton`.

**Organism (`src/design/organisms/`)**

- `RecentTracksRail` — présentationnel : `entries` (view-models), `isLiked(entry)`, `likingId`,
  `onToggle(entry)`, `onShare(entry)`, état vide. Compose `Rail` + `TrackRailItem[]`.
  Storybook-able avec données mock (vide / peuplé / like en cours).

**Container (`src/components/Player/`)**

- `RecentTracks` — devient une fine colle : lit les stores (`useNowPlayingStore`,
  `useLikedTracksStore`, `usePreferencesStore`), mappe en view-models, rend `RecentTracksRail`.
  Sépare le store du design system (condition pour documenter l'organism dans Storybook).

`RecentTrackCard` est supprimé (remplacé par `TrackRailItem` + le container).

Mise à jour de `apps/frontend/CLAUDE.md` : les références à `ui/` deviennent `atoms/` et la règle
Storybook s'étend aux molecules/organisms.

## Partie D — Storybook

- Story colocalisée par atom, molecule et organism : **tous les états × 2 thèmes**, addon-a11y clean.
  - `IconButton` : défaut / active / disabled / reveal.
  - `Thumbnail` : avec image / fallback / tailles.
  - `Rail` : peu d'items (pas de scroll) / beaucoup (drag).
  - `TrackRailItem` : liked / non-liked / liking / titre long tronqué.
  - `RecentTracksRail` : vide / peuplé / like en cours.
- `.storybook/preview` : import des deux fontsource + vérifier le toggle de thème (rendu 2 thèmes).
- Story `foundations/Typographie` mise à jour pour montrer l'appairage (display Instrument vs body Inter).

## Tests

- Conserver/adapter les tests existants (`RecentTracks.test.tsx`, `RecentTrackCard.test.tsx`) :
  état vide, like, partage — déplacés vers la nouvelle structure (container + `TrackRailItem`).
- Nouveaux tests unitaires présentationnels : `IconButton` (aria-label, disabled, onClick),
  `Thumbnail` (fallback sur erreur image), `TrackRailItem` (rend titre/artiste/heure, appelle
  `onToggle`/`onShare`).
- `Rail` : tester le contrat présentationnel (rend les enfants + `aria-label`). **Ne pas tester
  Embla** (dépendance). Risque jsdom : Embla nécessite des APIs de layout absentes en jsdom — vérifier
  qu'il dégrade proprement (slides rendus statiques) ; sinon isoler l'init derrière un garde testable.
- `pnpm typecheck && pnpm lint` zéro warning, `node scripts/check-contrast.mjs`, `pnpm test`.

## Roadmap (phases suivantes — hors périmètre de ce spec)

- **Phase 2** : migrer les molecules du Player (`TrackMeta`, `VolumeControl`, `PlaybackControls`)
  vers la taxonomie et les faire consommer `IconButton`/`Thumbnail`.
- **Phase 3** : organisms (`Player`, `AuthModal`, `LikedTracksModal`), templates/pages (`HomePage`, `Layout`).
- Chaque phase : son spec, son plan, sa PR.

## Risques

- **Embla en jsdom/Vitest** : init de layout absente → warnings ou rendu partiel. Mitigation :
  tester le contrat présentationnel, valider en Storybook + screenshots headless (dev :5199).
- **Churn de renommage** `ui/` → `atoms/…` : nombreux imports (`Button`, `Menu`, `Modal`) à mettre
  à jour. Mécanique ; garde-fou `pnpm typecheck`.
- **Reveal-on-hover × focus clavier** : vérifier que le focus clavier révèle les actions
  (`group-focus-within`) une fois dans le rail Embla.
- **Nouvelle dépendance** : `embla-carousel-react` + `embla-carousel-a11y` passent par Renovate ;
  ajout justifié (remplace du code maison non maintenable).
