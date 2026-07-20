# Design system v3 — « papier vivant » minimal chaleureux

Date : 2026-07-20 · Statut : validé section par section avec Victor · Remplace le cadrage « minimal radical » du même jour (7 cartes Claude Design et branche `fix/foundation-ink-contrast` obsolètes).

## Contexte et décision

Le design « papier journal » (mergé PR #101-#109) a été rejeté visuellement ; les fondations « minimal radical » commencées en Storybook (PR #110) sont remises en cause avec la direction. Cadrage validé :

- Tout est refait, direction incluse.
- Surface : frontend web seul (`apps/frontend`). Le mobile suivra dans un chantier séparé.
- Validation visuelle directement dans Storybook (plus de cartes Claude Design).
- Livrable : système complet **et** app entièrement migrée — l'ancien design disparaît.
- Approche retenue (A) : tokens 2 couches sur Tailwind 4 `@theme` + primitives headless Base UI stylées maison + migration incrémentale en PRs courtes.

La hiérarchie produit reste la référence de tout arbitrage UI : 1. écouter le direct, 2. découvrir, 3. partager, 4. réécouter. Rien hors de ces 4 usages (pas de compteur d'auditeurs).

## 1. Direction visuelle — le papier vivant, à contraste verrouillé

- **Deux modes seulement** : clair le jour, sombre la nuit, déclenchés par l'heure locale, avec un toggle discret persisté en secours. Le mode garantit la lisibilité.
- **Teinte continue** : à l'intérieur de chaque mode, la teinte du papier et de l'accent évolue avec l'heure (rosé à l'aube → neutre chaud à midi → ambré au crépuscule → bleuté la nuit). Couleurs définies en **OKLCH à luminosité (L) et chroma (C) fixes ; seule la teinte (H) interpole**. OKLCH étant perceptuellement uniforme, un contraste AA vérifié à L fixe reste AA pour toute teinte : la lisibilité est garantie par construction et prouvée par script (§5).
- Mise à jour de la teinte chaque minute (imperceptible). Les transitions visibles (bascule jour/nuit, toggle) respectent `prefers-reduced-motion`.
- **Accent « aube »** : signature de la marque, utilisé avec parcimonie (live, action primaire, focus). Sa teinte de référence est le rosé/ambré de l'aube ; elle glisse légèrement avec l'heure autour de cette référence, à L/C fixes comme le reste.
- Chaleur : papier blanc cassé chaud en clair, nuit bleu-encre profonde (jamais de noir pur) en sombre.
- **Typographie** : une seule famille sans-serif variable humaniste ; 2 candidates (dont Inter) comparées dans Storybook au checkpoint fondations. Échelle 5 niveaux (display, title, lead, body, caption) en `clamp()`, chiffres tabulaires pour les horaires, `line-height` sans unité, longueur de ligne ≤ ~66ch.

## 2. Architecture des tokens

Un seul fichier source `src/design/tokens.css`, deux couches :

- **Couche primitive** (jamais consommée par les composants) : teintes horaires (`--hue-*`), luminosités/chromas fixes par mode, échelle typo, échelle d'espacement base 8, rayons (2-3 max), durées/courbes de motion (150/250 ms, `ease-out`).
- **Couche sémantique** — l'unique API des composants : `surface`, `surface-raised`, `text`, `text-muted`, `text-faint`, `border`, `accent`, `on-accent`, `live`. Branchée sur Tailwind 4 `@theme` → utilities générées (`bg-surface`, `text-text-muted`, …). Zéro valeur hex/hsl/oklch dans les composants.

Mécanique :

- Mode sur `<html data-theme="day|night">`, posé par l'heure, surchargé par le toggle persisté (localStorage).
- Teinte continue dans une custom property mise à jour chaque minute par `lib/theme.ts` (remplace `lib/moments.ts`).
- `color-scheme: light dark` + `<meta name="color-scheme">` contre le flash blanc.
- La typo devient aussi des tokens `@theme` (`font-*`, `text-*`) consommés en utilities — les classes `.ds-*` de Storybook disparaissent, un seul système.
- La syntaxe `@theme` exacte est validée contre la doc Tailwind 4.3 à l'implémentation (doc-first).

**Conventions agent (livrable)** : section dans le CLAUDE.md frontend — patterns Tailwind v4 (pas de `tailwind.config.js`, pas de `@tailwind`), vocabulaire de tokens autorisé, interdiction des valeurs arbitraires (`bg-[#…]`). Motivation : combler le gap d'entraînement v3→v4 des agents et empêcher la dérive de classes.

## 3. Primitives et composants

- **Base UI** (`@base-ui-components/react`, v1.6 stable, équipes derrière Radix/Floating UI/MUI) fournit le comportement accessible : `Dialog` (remplace `ModalShell`), `Menu` (remplace `DropdownMenu`), `Slider` (remplace le range custom de `VolumeControl`), `Field`/`Input` (formulaires d'auth), `Tooltip` si besoin. Focus trap, clavier, aria fournis par la lib ; zéro style importé.
- **Primitives stylées** dans `src/components/ui/` : `Button` (variants `primary`/`ghost`/`icon`, tailles), `Input`, `Modal`, `Menu`, `Slider`. Chacune est l'unique façon de faire cette chose dans l'app. États obligatoires : hover, focus-visible, active, disabled, loading, error/empty quand pertinent. Cibles tactiles ≥ 44 px, focus visible sur l'accent.
- **Formulaires** : labels associés, `autocomplete`, validation au blur, messages d'erreur nommant problème + action corrective (via `Field`).
- Chaque primitive a sa story co-localisée : variants × états × 2 modes. Storybook est le contrat visuel validé avant migration des écrans.
- Les composants métier (Player, StationLog, TrackMeta…) composent primitives + tokens, sans style ad hoc.

## 4. Plan de migration (main-first, PRs courtes)

1. **PR 1 — Fondations** : `tokens.css` v3, `lib/theme.ts`, conventions agent CLAUDE.md, stories Fondations (palette 2 modes × échantillons horaires, typo avec les 2 candidates, espacement). Remplace les stories `.ds-*`. **Checkpoint : validation Victor dans Storybook.**
2. **PR 2 — Primitives** : dépendance Base UI + `Button`, `Input`, `Modal`, `Menu`, `Slider` + stories tous états × 2 modes. **Checkpoint Storybook.**
3. **PRs 3..n — Écrans, un par PR** : shell/header → Player (artwork, contrôles, volume, waveform) → modals (Auth, LikedTracks, About) → StationLog/historique → bannière PWA. Chaque PR migre l'écran complet et supprime ses styles ad hoc — jamais deux systèmes durablement dans un même écran.
4. **PR finale — Démolition** : `index.css` réduit à l'essentiel, fonts Spectral/Young Serif retirées, `lib/moments.ts` + `data-moment` supprimés, knip/lint confirment zéro code mort.

Chaque PR passe : `check-contrast` + typecheck + lint zéro warning + tests + screenshots. Merge au fil de l'eau, master reste vert.

## 5. Vérification et qualité

- **Contraste prouvé** : `scripts/check-contrast.mjs` étendu — paires sémantiques (`text`/`surface`, `text-muted`/`surface`, `on-accent`/`accent`, focus) × 24 positions horaires × 2 modes ; échec sous AA (4.5:1, 3:1 grands textes/composants UI). Branché au job Quality de la CI.
- **A11y Storybook** : addon a11y (axe) sur chaque story, violations bloquantes.
- **Tests** : Vitest suit la migration (comportement, pas les classes) ; tout bug corrigé reçoit un test de non-régression.
- **Boucle visuelle** : screenshots headless du dev server (jour + nuit, mobile + desktop) présentés avant chaque merge d'écran.
- **Motion** : décoratif sous `prefers-reduced-motion: no-preference` uniquement ; 150-250 ms, `ease-out`.

## Hors périmètre

- Mobile Expo (chantier séparé ; les tokens web ne sont pas conçus multi-plateforme).
- `/design-sync` vers Claude Design (différé ; à reconsidérer une fois le système stabilisé).
- Toute fonctionnalité produit nouvelle — ce chantier est purement design system + migration.
