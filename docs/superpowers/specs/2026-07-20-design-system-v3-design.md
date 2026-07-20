# Design system v3 — minimal chaleureux, l'onde comme matière

Date : 2026-07-20 · Statut : validé section par section avec Victor · Remplace le cadrage « minimal radical » du même jour (7 cartes Claude Design et branche `fix/foundation-ink-contrast` obsolètes).

## Contexte et décision

Le design « papier journal » (mergé PR #101-#109) a été rejeté visuellement ; les fondations « minimal radical » commencées en Storybook (PR #110) sont remises en cause avec la direction. Cadrage validé :

- Tout est refait, direction incluse.
- Surface : frontend web seul (`apps/frontend`). Le mobile suivra dans un chantier séparé.
- Validation visuelle directement dans Storybook (plus de cartes Claude Design).
- Livrable : système complet **et** app entièrement migrée — l'ancien design disparaît.
- Approche retenue (A) : tokens 2 couches sur Tailwind 4 `@theme` + primitives headless Base UI stylées maison + migration incrémentale en PRs courtes.

La hiérarchie produit reste la référence de tout arbitrage UI : 1. écouter le direct, 2. découvrir, 3. partager, 4. réécouter. Rien hors de ces 4 usages (pas de compteur d'auditeurs).

## 1. Direction visuelle — minimal chaleureux, l'onde comme matière

Décision (révision du 2026-07-20 soir) : le concept « papier vivant » (teinte évoluant avec l'heure) est **abandonné** — il ne porte pas les codes webradio et coûtait cher à prouver. L'originalité vit ailleurs :

- **Deux thèmes fixes** : clair chaleureux (papier blanc cassé chaud) / sombre bleu-encre profond (jamais de noir pur). Sélection par `prefers-color-scheme` + toggle discret **persisté**. Couleurs définies en OKLCH ; contraste AA vérifié sur les 2 palettes fixes (§5).
- **Signature : l'onde comme matière.** Le son est rendu visible — le flux audio réel est analysé en temps réel (WebAudio `AnalyserNode`, `WaveformCanvas` existant refondé) et dessiné en une ligne d'encre fine, organique, sur le papier. **C'est elle l'indicateur de direct** : la ligne ondule = la radio vit ; en pause/arrêt elle s'aplatit en filet. Aucun badge « LIVE » rouge. Déclinable : micro-onde dans le player réduit. Sous `prefers-reduced-motion: reduce`, l'onde devient un filet statique + mention textuelle du direct (l'information reste accessible).
- **Structure : la manchette.** Le morceau en cours composé en très grand (statique), hiérarchie éditoriale nette — le direct est le contenu principal de la page (usage n°1).
- **Accent « aube »** (rosé/ambré, fixe) : signature de marque, parcimonieux — action primaire, focus, points chauds. Pas d'accent rouge dédié au live : l'onde s'en charge.
- **Typographie** : une seule famille sans-serif variable humaniste ; 2 candidates (dont Inter) comparées dans Storybook au checkpoint fondations. Échelle 5 niveaux (display, title, lead, body, caption) en `clamp()`, chiffres tabulaires pour les horaires, `line-height` sans unité, longueur de ligne ≤ ~66ch.

## 2. Architecture des tokens

Un seul fichier source `src/design/tokens.css`, deux couches :

- **Couche primitive** (jamais consommée par les composants) : palette OKLCH des 2 thèmes, échelle typo, échelle d'espacement base 8, rayons (2-3 max), durées/courbes de motion (150/250 ms, `ease-out`).
- **Couche sémantique** — l'unique API des composants : `surface`, `surface-raised`, `text`, `text-muted`, `text-faint`, `border`, `accent`, `on-accent`, `live`. Branchée sur Tailwind 4 `@theme` → utilities générées (`bg-surface`, `text-text-muted`, …). Zéro valeur hex/hsl/oklch dans les composants.

Mécanique :

- Thème sur `<html data-theme="light|dark">`, suivant `prefers-color-scheme`, surchargé par le toggle persisté (localStorage) — logique dans `lib/theme.ts` (remplace `lib/moments.ts`, plus aucune logique horaire).
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

1. **PR 1 — Fondations** : `tokens.css` v3, `lib/theme.ts`, conventions agent CLAUDE.md, stories Fondations (palette 2 thèmes, typo avec les 2 candidates, espacement, étude de l'onde — ligne d'encre statique + variantes d'épaisseur/amplitude). Remplace les stories `.ds-*`. **Checkpoint : validation Victor dans Storybook.**
2. **PR 2 — Primitives** : dépendance Base UI + `Button`, `Input`, `Modal`, `Menu`, `Slider` + stories tous états × 2 modes. **Checkpoint Storybook.**
3. **PRs 3..n — Écrans, un par PR** : shell/header → Player (artwork, contrôles, volume, waveform) → modals (Auth, LikedTracks, About) → StationLog/historique → bannière PWA. Chaque PR migre l'écran complet et supprime ses styles ad hoc — jamais deux systèmes durablement dans un même écran.
4. **PR finale — Démolition** : `index.css` réduit à l'essentiel, fonts Spectral/Young Serif retirées, `lib/moments.ts` + `data-moment` supprimés, knip/lint confirment zéro code mort.

Chaque PR passe : `check-contrast` + typecheck + lint zéro warning + tests + screenshots. Merge au fil de l'eau, master reste vert.

## 5. Vérification et qualité

- **Contraste prouvé** : `scripts/check-contrast.mjs` — paires sémantiques (`text`/`surface`, `text-muted`/`surface`, `on-accent`/`accent`, focus) × 2 thèmes ; échec sous AA (4.5:1, 3:1 grands textes/composants UI). Branché au job Quality de la CI.
- **A11y Storybook** : addon a11y (axe) sur chaque story, violations bloquantes.
- **Tests** : Vitest suit la migration (comportement, pas les classes) ; tout bug corrigé reçoit un test de non-régression.
- **Boucle visuelle** : screenshots headless du dev server (jour + nuit, mobile + desktop) présentés avant chaque merge d'écran.
- **Motion** : décoratif sous `prefers-reduced-motion: no-preference` uniquement ; 150-250 ms, `ease-out`.

## Hors périmètre

- Mobile Expo (chantier séparé ; les tokens web ne sont pas conçus multi-plateforme).
- `/design-sync` vers Claude Design (différé ; à reconsidérer une fois le système stabilisé).
- Toute fonctionnalité produit nouvelle — ce chantier est purement design system + migration.
