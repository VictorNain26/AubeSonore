# Design v3 — PR 4 Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer l'écran Player complet (manchette, artwork, contrôles, volume, onde) vers les tokens et primitives v3, avec la refonte de l'onde en « ligne d'encre » qui devient l'indicateur de direct (le badge rouge « En direct » disparaît).

**Architecture:** Deux extensions de primitives d'abord (`Slider` vertical, `Modal` contrôlé) car les refontes en dépendent. Puis la signature (WaveformCanvas ligne d'encre + AntennaStatus sans badge), puis les remaps composant par composant (manchette, artwork, contrôles, volume, bio/panneau artiste), enfin la racine `index.tsx` (skeletons v3, `font-sans` sur la colonne du direct). `StationLog` reste legacy (PR suivante) ; les alias v3 le gardent lisible.

**Tech Stack:** React 19, Base UI (`@base-ui/react` Dialog/Slider), Canvas 2D, motion/react, Tailwind 4 tokens v3, Vitest 3.

## Global Constraints

- Composants migrés : tokens v3 uniquement — `bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-text-faint`, `border-border`, `bg-accent`, `text-accent`, `text-on-accent`, `dawn-glow` ; typo `text-display|title|lead|body|caption` ; radii `rounded-sm|md|full`. Zéro hex/hsl/oklch hors `src/design/tokens.css` ; zéro valeur arbitraire couleur/espacement/typo.
- Dark : `data-theme="dark"` + variante `dark:` uniquement. Les composants migrés lisent les vars v3 (`--color-text`, pas `--color-ink`).
- Interactifs : hover, focus-visible (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`), active, disabled ; cible ≥ 44 px.
- Motion décorative : 150–250 ms, `ease-out-quart`, sous `prefers-reduced-motion: no-preference` seulement. L'onde figée + mention textuelle du direct sous `reduce` (spec §1).
- Zéro commentaire sauf WHY non évident (conserver les commentaires WHY existants). Named exports (sauf `Player` default existant). Pas d'`eslint-disable`.
- Avant « done » de chaque task : typecheck + lint zéro warning + tests concernés. Gates complets en Task 8.
- Commits : Conventional Commits anglais scope `frontend`, staging fichier par fichier. **Tout fichier `docs/**/\*.md`committé passe`npx prettier --write` avant staging\*\* (leçon PR #116 : le format check CI couvre les .md).
- Doc-first : API Base UI (Slider `orientation`, Dialog contrôlé) vérifiée contre https://base-ui.com/react/components/slider et https://base-ui.com/react/components/dialog (ou les `.d.ts` de `node_modules/@base-ui/react`) avant d'écrire ; URL/champ cités dans le commit.
- Chaque extension de primitive : story colocalisée mise à jour (états × 2 thèmes) + test.

---

### Task 1: Primitive Slider — orientation verticale

**Files:**

- Modify: `apps/frontend/src/design/ui/Slider.tsx`
- Modify: `apps/frontend/src/design/ui/Slider.test.tsx`
- Modify: `apps/frontend/src/design/ui/Slider.stories.tsx`

**Interfaces:**

- Consumes: API existante `{ label, value, onValueChange, min?, max?, step?, disabled? }` (wrapper `@base-ui/react/slider`).
- Produces: prop `orientation?: 'horizontal' | 'vertical'` (défaut `'horizontal'`, comportement existant inchangé). En vertical : hauteur utile `h-32`, largeur cible tactile `w-11`, track `w-1` centré, indicator ancré en bas, thumb identique. Task 5 consomme `<Slider orientation="vertical" …/>`.

- [ ] **Step 1: Doc-first** — vérifier la prop `orientation` de Base UI Slider (`Slider.Root orientation="vertical"`) dans https://base-ui.com/react/components/slider ou `node_modules/@base-ui/react/**/slider/**/*.d.ts` : nom exact, valeurs, effet sur `Track`/`Indicator`/`Thumb` (data-attributes). Citer la source dans le commit.
- [ ] **Step 2: Test qui échoue** — dans `Slider.test.tsx`, ajouter : rendu `<Slider label="Volume" orientation="vertical" value={0.5} onValueChange={() => {}} min={0} max={1} step={0.05} />` → l'élément `role="slider"` porte `aria-orientation="vertical"` ; et un test clavier existant reste vert en horizontal (non-régression).
- [ ] **Step 3: Vérifier l'échec** — Run: `pnpm --filter @aubesonore/frontend test -- src/design/ui/Slider.test.tsx`. Expected: FAIL (prop inconnue / aria-orientation absent).
- [ ] **Step 4: Implémenter** — passer `orientation` à `Slider.Root` ; classes conditionnelles : horizontal = classes actuelles ; vertical = conteneur `flex h-32 w-11 items-center justify-center`, `Control` pleine hauteur, `Track` `h-full w-1`, `Indicator` plein bas, `Thumb` inchangé (focus-visible accent conservé). Aucun changement de l'API horizontale.
- [ ] **Step 5: Vérifier** — Run: `pnpm --filter @aubesonore/frontend test -- src/design/ui/Slider.test.tsx`. Expected: PASS (tous, anciens inclus).
- [ ] **Step 6: Story** — ajouter `Vertical` dans `Slider.stories.tsx` (même pattern que les stories existantes).
- [ ] **Step 7: Commit** — `feat(frontend): slider primitive supports vertical orientation` (+ URL doc), git add fichier par fichier.

---

### Task 2: Primitive Modal — mode contrôlé sans trigger

**Files:**

- Modify: `apps/frontend/src/design/ui/Modal.tsx`
- Modify: `apps/frontend/src/design/ui/Modal.test.tsx`
- Modify: `apps/frontend/src/design/ui/Modal.stories.tsx`

**Interfaces:**

- Consumes: API existante de `Modal` (lis le fichier : wrapper `@base-ui/react/dialog` avec `trigger` requis).
- Produces: `trigger` devient optionnel ; nouvelles props `open?: boolean` et `onOpenChange?: (open: boolean) => void` passées à `Dialog.Root`. Usage contrôlé : `<Modal title="…" open={isOpen} onOpenChange={(o) => !o && onClose()}>…</Modal>`. Task 6 consomme ce mode. L'usage existant avec trigger reste identique.

- [ ] **Step 1: Doc-first** — vérifier `open`/`onOpenChange`/`defaultOpen` de Base UI Dialog.Root (https://base-ui.com/react/components/dialog ou `.d.ts`). Citer la source dans le commit.
- [ ] **Step 2: Test qui échoue** — dans `Modal.test.tsx` : rendu contrôlé sans trigger avec `open={true}` → contenu visible ; clic sur le bouton fermer (ou Escape) → `onOpenChange(false)` appelé ; `open={false}` → contenu absent.
- [ ] **Step 3: Vérifier l'échec** — Run: `pnpm --filter @aubesonore/frontend test -- src/design/ui/Modal.test.tsx`. Expected: FAIL.
- [ ] **Step 4: Implémenter** — `trigger?: ReactElement`, rendre `<Dialog.Trigger>` seulement si `trigger` fourni ; propager `open`/`onOpenChange` à `Dialog.Root`. Rien d'autre ne change (overlay, popup, focus trap Base UI).
- [ ] **Step 5: Vérifier** — Run: `pnpm --filter @aubesonore/frontend test -- src/design/ui/Modal.test.tsx`. Expected: PASS (tous).
- [ ] **Step 6: Story** — ajouter `Controlled` (bouton externe qui ouvre, état local dans la story).
- [ ] **Step 7: Commit** — `feat(frontend): modal primitive supports controlled open state` (+ URL doc).

---

### Task 3: L'onde « ligne d'encre » + AntennaStatus sans badge rouge

**Files:**

- Modify: `apps/frontend/src/components/Player/WaveformCanvas.tsx`
- Modify: `apps/frontend/src/components/Player/AntennaStatus.tsx`
- Modify: `apps/frontend/src/components/Player/Antenna.tsx`
- Modify: `apps/frontend/src/components/Player/AntennaStatus.test.tsx` (adapter)
- Modify: `apps/frontend/src/components/Player/Antenna.test.tsx` (adapter si besoin)

**Interfaces:**

- Consumes: pipeline existant de `WaveformCanvas` (props `isPlaying`, `songId` ; AnalyserNode via `getAnalyser()` ; refs de lissage 48 points ; DPR/ResizeObserver/visibilitychange ; cache couleur keyé `dataset.theme`).
- Produces: l'onde est une **ligne continue**, plus des barres — c'est l'indicateur de direct. `AntennaStatus` ne porte plus aucun rouge. Aucune modification d'API des composants.

- [ ] **Step 1: Refonte du dessin dans `WaveformCanvas.tsx`** — conserver TOUT le pipeline (échantillonnage fréquentiel mappé + lissage 0.35, génération procédurale sinusoïdale en fallback, DPR, resize, visibility, reduced-motion qui fige `timeRef`, cache couleur `dataset.theme`). Remplacer uniquement la boucle de dessin des `roundRect` par une ligne :

```ts
const POINTS = 48;
const mid = height / 2;
const values = smoothedDataRef.current;
ctx.beginPath();
ctx.lineWidth = (isPlaying ? 1.6 : 1) * dpr;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = isPlaying
  ? `color-mix(in srgb, ${inkColor} 78%, transparent)`
  : `color-mix(in srgb, ${inkColor} 30%, transparent)`;
const stepX = width / (POINTS - 1);
const amplitude = height * 0.42;
for (let i = 0; i < POINTS; i++) {
  const signed = isPlaying ? (values[i] - 0.15) * Math.sin(i * 0.85 + time * 2.2) : 0;
  const y = mid + signed * amplitude;
  const x = i * stepX;
  if (i === 0) ctx.moveTo(x, y);
  else {
    const prevX = (i - 1) * stepX;
    const prevSigned = isPlaying
      ? (values[i - 1] - 0.15) * Math.sin((i - 1) * 0.85 + time * 2.2)
      : 0;
    const prevY = mid + prevSigned * amplitude;
    ctx.quadraticCurveTo(prevX + stepX / 2, (prevY + y) / 2, x, y);
  }
}
ctx.stroke();
```

(Adapter les noms aux refs réelles du fichier ; `accentColor` n'est plus utilisé pour l'onde — supprimer sa lecture si plus consommée ailleurs dans le fichier. La var lue devient `--color-text` au lieu de `--color-ink` — composant migré = vocabulaire v3.) À l'arrêt : `signed = 0` → filet horizontal continu. Sous `prefers-reduced-motion` : `time` figé → ligne organique statique (déjà géré par `timeRef`).

- [ ] **Step 2: `AntennaStatus.tsx`** — supprimer le bloc badge (`span` avec `text-danger` + point `bg-danger animate-pulse`). « En direct » reste en texte simple `text-text-muted` (mention textuelle du direct, exigée sous reduced-motion par la spec §1 — toujours visible, pas de rouge, pas d'animation). Remaps : `text-ink-faint` → `text-text-faint`, `text-ink-soft` → `text-text-muted`. Rien d'autre ne change (interval du temps écoulé conservé).
- [ ] **Step 3: `Antenna.tsx`** — remap `text-ink-soft` → `text-text-muted` sur le message hors antenne. Rien d'autre.
- [ ] **Step 4: Adapter les tests** — `AntennaStatus.test.tsx` : si des assertions ciblent le badge/classes rouges, les remplacer par « le texte “En direct” est présent sans le point animé » (comportement). Lancer : `pnpm --filter @aubesonore/frontend test -- src/components/Player`. Expected: PASS.
- [ ] **Step 5: Vérification visuelle rapide** — `pnpm --filter @aubesonore/frontend dev` (port 5173) + capture 1 vue (desktop clair) via la méthode CDP de la session (script `$CLAUDE_JOB_DIR/tmp/shot.mjs` adaptable) : la ligne d'encre est visible sous la manchette, aucun badge rouge. Joindre le constat au rapport.
- [ ] **Step 6: Commit** — `feat(frontend): waveform becomes the ink-line live indicator, red badge removed`.

---

### Task 4: Manchette et actions — TrackMeta, TrackArtwork, PlaybackControls, AirPlayButton

**Files:**

- Modify: `apps/frontend/src/components/Player/TrackMeta.tsx`
- Modify: `apps/frontend/src/components/Player/TrackArtwork.tsx`
- Modify: `apps/frontend/src/components/Player/PlaybackControls.tsx`
- Modify: `apps/frontend/src/components/Player/AirPlayButton.tsx`

**Interfaces:**

- Consumes: `Button` v3 (`variant="icon"`, `size-11`, états complets) de `../../design/ui/Button` ; tokens v3.
- Produces: plus aucun `IconButton` legacy ni classe `ink/paper/danger` dans ces 4 fichiers. APIs des composants inchangées.

- [ ] **Step 1: `TrackMeta.tsx`** — remaps exacts : `font-display text-title lg:text-display text-ink` → `text-title lg:text-display font-medium text-text` (la manchette passe en sans v3 — le conteneur reçoit `font-sans` en Task 7, ajouter `font-sans` localement sur le bloc titre en attendant est interdit : mettre `font-sans` sur l'élément racine du composant) ; `text-lead text-ink-soft` → `text-lead text-text-muted` ; `decoration-line hover:decoration-ink` → `decoration-border hover:decoration-text` + ajouter `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-sm` sur le bouton-lien artiste ; les 2 `IconButton` (partage, like) → `Button variant="icon"` avec les mêmes `aria-label`/`aria-pressed`/`disabled` ; état liked : `text-danger` → `text-accent` (l'accent aube marque le point chaud ; le rouge danger disparaît de l'écran).
- [ ] **Step 2: `TrackArtwork.tsx`** — `rounded-lg` → `rounded-md` ; `bg-paper-raised` → `bg-surface-raised` ; `text-ink-faint` → `text-text-faint` ; `duration-500 ease-(--ease-fluid)` → `duration-250 ease-out-quart` (motion v3, 150-250 ms). `aspect-square`/`width`/`height` existants conservés (CLS).
- [ ] **Step 3: `PlaybackControls.tsx`** — conserver `bg-accent text-on-accent` (déjà vocabulaire v3), ajouter `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent` ; vérifier cible ≥ 44 px (size-14 actuel = 56 px, OK) ; `active:brightness-90` → `active:opacity-80` (cohérent avec Button v3).
- [ ] **Step 4: `AirPlayButton.tsx`** — `IconButton` → `Button variant="icon"` (mêmes aria) ; `text-accent hover:text-accent` conservés (v3) ; point indicateur `bg-accent` conservé.
- [ ] **Step 5: Vérifier** — `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint && pnpm --filter @aubesonore/frontend test`. Expected: exit 0, zéro warning. Grep de garde : `grep -n "ink\|paper\|danger\|IconButton" src/components/Player/{TrackMeta,TrackArtwork,PlaybackControls,AirPlayButton}.tsx` → zéro résultat.
- [ ] **Step 6: Commit** — `feat(frontend): v3 masthead, artwork and control actions on design primitives`.

---

### Task 5: VolumeControl sur le Slider v3 vertical

**Files:**

- Modify: `apps/frontend/src/components/Player/VolumeControl.tsx`

**Interfaces:**

- Consumes: `Slider` v3 avec `orientation="vertical"` (Task 1) ; `Button` v3 `variant="icon"`.
- Produces: plus de slider fait main (drag/clavier/ARIA manuels supprimés — Base UI les fournit). La logique produit reste : popup au hover (desktop) / tap (mobile, `matchMedia('(hover: none)')`), délai de fermeture 300 ms, clic extérieur mobile, mute (`toggleMute` + touche m gérée par… supprimer le raccourci `m` custom si le slider Base UI ne le fournit pas : YAGNI, le bouton mute reste). API du composant inchangée (aucune prop).

- [ ] **Step 1: Réécrire le bloc slider** — dans le popup : remplacer le `div[role="slider"]` custom + piste + thumb + handlers `mousedown/touchstart/mousemove/…/onKeyDown` par :

```tsx
<Slider
  label="Volume"
  orientation="vertical"
  min={0}
  max={1}
  step={0.05}
  value={isMuted ? 0 : volume}
  onValueChange={(v) => setVolume(v)}
/>
```

(Signature exacte de `onValueChange` : reprendre celle de la primitive — lis `design/ui/Slider.tsx`.) Conserver : structure popup (`absolute bottom-full`…), timers hover/close 300 ms, détection mobile, clic extérieur, bouton mute.

- [ ] **Step 2: Remaps du popup** — `panel` → `rounded-md border border-border bg-surface-raised` (+ conserver l'ombre si le popup en avait via `panel` : utiliser `shadow-lg` interdit ? Non-token — reprendre le pattern du Popup de `design/ui/Menu.tsx` qui est LA référence popup v3, sans ombre custom) ; `bg-line`/`bg-ink` disparaissent avec le slider custom ; `ease-(--ease-snappy)` → `ease-out-quart` ; `IconButton` → `Button variant="icon"` (aria-label conservés, y compris l'état mute).
- [ ] **Step 3: Vérifier** — typecheck + lint + `pnpm --filter @aubesonore/frontend test -- src/components/Player`. Grep de garde : `grep -nE "role=\"slider\"|panel|bg-ink|bg-line|IconButton" src/components/Player/VolumeControl.tsx` → zéro résultat.
- [ ] **Step 4: Vérification manuelle dev** — au clavier : Tab jusqu'au thumb, flèches haut/bas changent le volume (Base UI) ; au hover : le popup s'ouvre/se ferme avec le délai. Consigner dans le rapport.
- [ ] **Step 5: Commit** — `feat(frontend): volume control on v3 vertical slider primitive`.

---

### Task 6: ArtistBio + ArtistContext sur Modal v3

**Files:**

- Modify: `apps/frontend/src/components/Player/ArtistBio.tsx`
- Modify: `apps/frontend/src/components/Player/ArtistContext.tsx`
- Modify: `apps/frontend/src/components/Player/ArtistBio.test.tsx` (adapter si des classes sont assertées)

**Interfaces:**

- Consumes: `Modal` v3 contrôlé (Task 2 : `open`, `onOpenChange`, `title`).
- Produces: `ArtistContext` ne consomme plus `ModalShell` (qui reste pour `AboutModal`/`LikedTracksModal`/`AuthModal`, migrés PR suivante). APIs (`isOpen`/`onClose`, `onOpenPanel`) inchangées.

- [ ] **Step 1: `ArtistBio.tsx`** — remaps : `skeleton` (x3) → `animate-pulse rounded-md bg-surface-raised` (mêmes dimensions) ; `text-body text-ink-soft` → `text-body text-text-muted` ; `text-caption text-ink-faint` → `text-caption text-text-faint` ; lien « En savoir plus » : `decoration-line hover:decoration-ink` → `decoration-border hover:decoration-text` + focus-visible accent (même recette que TrackMeta).
- [ ] **Step 2: `ArtistContext.tsx`** — remplacer `ModalShell` par `Modal` v3 contrôlé : `<Modal title={artistName ?? 'Artiste'} open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>` (adapter au JSX réel). Remaps intérieurs : `skeleton` → pulse v3 (comme Step 1) ; `bg-paper-raised` → `bg-surface-raised` ; `border-line` → `border-border` ; `text-ink-soft` → `text-text-muted` ; `text-ink-faint` → `text-text-faint` ; tags `rounded-full` conservés.
- [ ] **Step 3: Vérifier** — typecheck + lint + `pnpm --filter @aubesonore/frontend test -- src/components/Player`. Grep : `grep -nE "ModalShell|skeleton|ink|paper|line" src/components/Player/{ArtistBio,ArtistContext}.tsx` → zéro résultat (hors mots FR légitimes).
- [ ] **Step 4: Commit** — `feat(frontend): artist bio and context panel on v3 modal`.

---

### Task 7: Racine Player — index.tsx, artwork-size, colonne en sans v3

**Files:**

- Modify: `apps/frontend/src/components/Player/index.tsx`
- Modify: `apps/frontend/src/design/tokens.css` (ajout `@utility artwork-size`)
- Modify: `apps/frontend/src/index.css` (suppression `.artwork-size` legacy)

**Interfaces:**

- Consumes: tous les enfants migrés (Tasks 3–6) ; utility `artwork-size` déplacée en v3.
- Produces: l'écran « le direct » est 100 % v3 ; `StationLog` (colonne journal) reste legacy jusqu'à la PR suivante, lisible via les alias.

- [ ] **Step 1: Déplacer `artwork-size`** — copier la définition (base + media query `min-width: 64rem`) depuis `index.css` vers `tokens.css` en `@utility artwork-size` (une `@utility` par variante n'est pas nécessaire : `@utility` accepte les media queries imbriquées — sinon garder deux blocs ; vérifier doc Tailwind si doute). Supprimer la version `@layer utilities` d'`index.css`.
- [ ] **Step 2: `index.tsx`** — ajouter `font-sans` à la constante `DIRECT` (la colonne du direct passe en Inter ; `StationLog`, hors de `DIRECT`, garde le serif legacy jusqu'à sa PR) ; skeletons : `skeleton` (x6) → `animate-pulse bg-surface-raised` + le radius de chaque bloc (`rounded-md` pour l'artwork — aligné sur TrackArtwork Task 4 —, `rounded-full` pour le rond `size-14`, `rounded-sm` pour les lignes de texte) ; `rule pt-2` (x2) → `border-t border-border pt-2` ; `rounded-lg` (skeleton artwork) → `rounded-md`.
- [ ] **Step 3: Vérifier** — typecheck + lint + tests + `pnpm --filter @aubesonore/frontend build` ; grep dans le CSS buildé : `.artwork-size` toujours émis (référencé par index.tsx) ; grep de garde : `grep -nE "\bskeleton\b|\brule\b|rounded-lg" src/components/Player/index.tsx` → zéro.
- [ ] **Step 4: Commit** — `feat(frontend): player composition root on v3 tokens` (2 commits si tu préfères séparer le déplacement d'utility : `refactor(frontend): artwork-size utility moves to v3 tokens`).

---

### Task 8: Validation finale — gates, screenshots, PR

**Files:** aucun nouveau (corrections éventuelles).

- [ ] **Step 1: Gates complets** — Run à la racine : `pnpm typecheck && pnpm lint && pnpm format:check && node apps/frontend/scripts/check-contrast.mjs && pnpm --filter=@aubesonore/frontend test --run --coverage && pnpm --filter @aubesonore/frontend build`. Expected: exit 0 partout, zéro warning, functions ≥ 70 %.
- [ ] **Step 2: Screenshots** — dev server 5173, 4 vues (clair/sombre × 1280×800 / 390×844) via la méthode CDP (script de la session). Vérifier : ligne d'encre visible (indicateur de direct), plus aucun rouge « En direct », manchette en sans, volume/modal fonctionnels visuellement, `StationLog` legacy lisible dans les 2 thèmes. Présenter les 4 captures avant merge.
- [ ] **Step 3: Push + PR** — titre `feat(frontend): design system v3 player screen`, corps citant spec/plan/docs consultées + décisions (badge rouge supprimé au profit de l'onde, cœur liké en accent, manchette sans-serif). Auto-merge quand les 4 checks sont verts.
