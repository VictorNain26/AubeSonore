# « Papier du moment », deuxième impression — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ré-exécuter le design system « Le papier du moment » pour éliminer tous les marqueurs de design généré par IA (spec : `docs/superpowers/specs/2026-07-17-papier-du-moment-deuxieme-impression-design.md`).

**Architecture:** Tous les tokens vivent dans `apps/frontend/src/index.css` (Tailwind 4, bloc `@theme`), toute la motion dans `apps/frontend/src/lib/motion.ts`. Les composants ne changent pas d'API — seuls tokens, presets et copy changent. `/dev/system` (`?moment=dawn|day|dusk|night` en DEV) est la page de référence.

**Tech Stack:** React 19, Vite 8, Tailwind 4 (`@theme`), motion/react 12, Fontsource, Vitest 3.

## Global Constraints

- Copy UI en français ; commits Conventional Commits en anglais, co-author ajouté par le hook husky — ne jamais `--no-verify`.
- `git add <fichier>` explicite, jamais `git add .`.
- Pas de commentaires dans le code sauf contrainte non exprimable par le code ; exports nommés.
- Aucun hex/hsl codé en dur hors `index.css` ; aucune `transition={{...}}` littérale hors presets de `motion.ts`.
- Après chaque tâche : `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint` propres (depuis la racine du repo).
- Cible finale : plus aucune référence à Fraunces ni Inter ; contrastes AA (texte 4.5:1, graphique 3:1) ; `prefers-reduced-motion` = aucune animation.
- Branche de travail : `feat/design-system-uniformity` (déjà active).

---

### Task 1: Polices — Young Serif (display) + Spectral (texte)

**Files:**

- Modify: `apps/frontend/package.json` (via pnpm)
- Modify: `apps/frontend/src/main.tsx:4-7`
- Modify: `apps/frontend/src/index.css:87-101`
- Modify: `apps/frontend/src/pages/DevSystemPage.tsx:5-11`

**Interfaces:**

- Produces: token CSS `--font-text` (remplace `--font-sans`) et `--font-display` pointant sur Young Serif. La classe Tailwind `font-display` continue de fonctionner ; aucune classe `font-sans` n'existe dans le code (vérifié).

- [ ] **Step 1: Échanger les paquets Fontsource**

Run (depuis la racine) :

```bash
pnpm --filter @aubesonore/frontend remove @fontsource/inter @fontsource-variable/fraunces
pnpm --filter @aubesonore/frontend add @fontsource/young-serif @fontsource/spectral
```

Expected: `package.json` du frontend contient `@fontsource/young-serif` et `@fontsource/spectral`, plus aucune trace d'inter/fraunces. Seule la `pnpm-lock.yaml` racine bouge.

- [ ] **Step 2: Remplacer les imports dans `src/main.tsx`**

Remplacer les lignes 4-7 :

```ts
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/400-italic.css';
import '@fontsource/spectral/500.css';
import '@fontsource/spectral/600.css';
import '@fontsource/young-serif/400.css';
```

- [ ] **Step 3: Basculer les tokens dans `src/index.css`**

Dans le bloc `@theme`, remplacer :

```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-display: 'Fraunces Variable', Georgia, serif;
```

par :

```css
--font-text: 'Spectral', Georgia, serif;
--font-display: 'Young Serif', Georgia, serif;
```

Dans `@layer base` → `body`, remplacer `font-family: var(--font-sans);` par :

```css
font-family: var(--font-text);
font-variant-numeric: tabular-nums;
```

(`tabular-nums` global = généralisation spec §1 : horloge, heures du rail, timeline, compteur.)

- [ ] **Step 4: Mettre à jour les libellés de `DevSystemPage.tsx`**

Remplacer le tableau `TYPE_SCALE` :

```tsx
const TYPE_SCALE = [
  { cls: 'text-display font-display', label: 'display / Young Serif' },
  { cls: 'text-title font-display', label: 'title / Young Serif' },
  { cls: 'text-lead', label: 'lead / Spectral' },
  { cls: 'text-body', label: 'body / Spectral' },
  { cls: 'text-caption', label: 'caption / Spectral' },
] as const;
```

- [ ] **Step 5: Vérifier l'éradication et la santé**

Run :

```bash
grep -rniE "fraunces|fontsource/inter|'inter'" apps/frontend/src apps/frontend/index.html apps/frontend/package.json
pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint && pnpm --filter @aubesonore/frontend test -- --run
```

Expected: grep vide ; les trois commandes passent. Contrôle visuel : `pnpm --filter @aubesonore/frontend dev` puis `http://localhost:5173/dev/system` — display en Young Serif (empattements ronds, chaleureuse), texte en Spectral.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/package.json pnpm-lock.yaml apps/frontend/src/main.tsx apps/frontend/src/index.css apps/frontend/src/pages/DevSystemPage.tsx
git commit -m "feat(frontend): replace Fraunces/Inter with Young Serif and Spectral"
```

---

### Task 2: Palettes aube (rose/framboise) et crépuscule (lilas/ambre)

**Files:**

- Modify: `apps/frontend/src/index.css:18-24` (bloc dawn), `:34-40` (bloc dusk), `:63` (`--color-accent-dawn`)

**Interfaces:**

- Consumes: rien (tokens seuls).
- Produces: nouvelles valeurs `--paper/--ink/--accent/--on-accent` pour `dawn` et `dusk`. Les dérivés `color-mix` s'adaptent seuls.

Note d'application spec §2 : le couple ambre/lilas à `hsl(30 80% 40%)` mesure ~3.6:1 (< AA texte). La clause d'ajustement de la spec s'applique : l'ambre est abaissé à `hsl(30 85% 33%)` (~4.9:1).

- [ ] **Step 1: Écrire le script de contraste (garde-fou avant modification)**

Create `apps/frontend/scripts/check-contrast.mjs` :

```js
const hsl2rgb = (h, s, l) => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [r + m, g + m, b + m];
};
const lum = (rgb) =>
  rgb
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => {
  const [l1, l2] = [lum(hsl2rgb(...a)), lum(hsl2rgb(...b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const mix = (ink, paper, pct) =>
  hsl2rgb(...ink).map((v, i) => v * pct + hsl2rgb(...paper)[i] * (1 - pct));
const ratioMixed = (ink, paper, pct) => {
  const [l1, l2] = [lum(mix(ink, paper, pct)), lum(hsl2rgb(...paper))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const MOMENTS = {
  dawn: { paper: [10, 45, 93], ink: [350, 25, 14], accent: [345, 55, 45] },
  day: { paper: [210, 36, 97], ink: [220, 26, 12], accent: [214, 74, 38] },
  dusk: { paper: [270, 20, 93], ink: [270, 20, 12], accent: [30, 85, 33] },
  night: { paper: [240, 18, 10], ink: [40, 30, 92], accent: [230, 45, 74] },
};
let fail = false;
for (const [name, m] of Object.entries(MOMENTS)) {
  const accent = ratio(m.accent, m.paper);
  const inkFaint = ratioMixed(m.ink, m.paper, 0.63);
  const ok = accent >= 4.5 && inkFaint >= 4.5;
  if (!ok) fail = true;
  console.log(
    `${name}: accent/paper ${accent.toFixed(2)} inkFaint/paper ${inkFaint.toFixed(2)} ${ok ? 'OK' : 'FAIL'}`
  );
}
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Lancer le script, vérifier que les quatre moments passent**

Run: `node apps/frontend/scripts/check-contrast.mjs`
Expected: quatre lignes `OK`, exit 0. Si `dusk` FAIL, abaisser la luminosité du 3e paramètre `accent` de `dusk` dans le script ET dans le CSS de l'étape 3 jusqu'à OK (par pas de 2).

- [ ] **Step 3: Remplacer les blocs dawn et dusk dans `src/index.css`**

```css
[data-moment='dawn'] {
  /* Aube — papier rose pâle, encre brun-rosé, accent framboise */
  --paper: hsl(10 45% 93%);
  --ink: hsl(350 25% 14%);
  --accent: hsl(345 55% 45%);
  --on-accent: hsl(10 45% 96%);
}
```

```css
[data-moment='dusk'] {
  /* Crépuscule — papier lilas cendré, encre violet-noir, accent ambre brûlé */
  --paper: hsl(270 20% 93%);
  --ink: hsl(270 20% 12%);
  --accent: hsl(30 85% 33%);
  --on-accent: hsl(270 20% 96%);
}
```

Et dans `@theme`, remplacer `--color-accent-dawn: hsl(12 62% 42%);` par :

```css
--color-accent-dawn: hsl(345 55% 45%);
```

- [ ] **Step 4: Contrôle visuel + santé**

Run: dev server, ouvrir `http://localhost:5173/?moment=dawn` puis `?moment=dusk`.
Expected: aube rosée à accent framboise, crépuscule lilas à accent ambre ; aucun résidu crème/terracotta. Puis `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint`.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/index.css apps/frontend/scripts/check-contrast.mjs
git commit -m "feat(frontend): redesign dawn and dusk palettes off the AI-cliche axis"
```

---

### Task 3: Signature — le ciel dans le papier (`--sky`)

**Files:**

- Modify: `apps/frontend/src/index.css` (les 4 blocs moment + `@layer base` body + `DevSystemPage` note)
- Modify: `apps/frontend/src/pages/DevSystemPage.tsx` (section Encres & papiers)

**Interfaces:**

- Produces: variable `--sky` définie par moment (hors `@theme` : consommée uniquement par le fond du body).

- [ ] **Step 1: Ajouter `--sky` à chaque bloc moment dans `src/index.css`**

Ajouter une ligne par bloc (valeurs spec §3) :

```css
/* night (bloc :root, [data-moment='night']) */
--sky: hsl(238 22% 13%);
/* dawn */
--sky: hsl(8 55% 89%);
/* day */
--sky: hsl(210 45% 94%);
/* dusk */
--sky: hsl(268 28% 89%);
```

- [ ] **Step 2: Poser le dégradé sur le body**

Dans `@layer base` → `body`, ajouter après `background-color: var(--color-paper);` :

```css
background-image: linear-gradient(to bottom, var(--sky), var(--paper) 40%);
background-attachment: fixed;
```

(`background-color` reste : le fondu 1200 ms entre moments continue d'animer la couleur de base ; le dégradé, non animable, bascule instantanément — écart discret accepté, spec §3. Les surfaces `.panel`/toasts restent en aplat : déjà le cas, ne pas les toucher.)

- [ ] **Step 3: Documenter sur `/dev/system`**

Dans `DevSystemPage.tsx`, section « Encres & papiers », ajouter après le bloc des `INKS` :

```tsx
<div
  className="h-16 rounded-md border border-line"
  style={{ background: 'linear-gradient(to bottom, var(--sky), var(--paper))' }}
>
  <span className="text-caption text-ink-faint">--sky → --paper (fond de page)</span>
</div>
```

(Exception à la règle « pas de style inline » : jeton non exposé à `@theme`, page de dev uniquement.)

- [ ] **Step 4: Contrôle visuel + santé**

Dev server, comparer `?moment=dawn|day|dusk|night` : haut de page légèrement plus chromatique, fondu invisible à mi-écran, modale (bouton À propos) toujours en aplat. Puis typecheck + lint.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/index.css apps/frontend/src/pages/DevSystemPage.tsx
git commit -m "feat(frontend): add per-moment sky gradient as paper signature"
```

---

### Task 4: Motion — l'encre, pas l'ascenseur

**Files:**

- Modify: `apps/frontend/src/lib/motion.ts` (réécriture)
- Modify: `apps/frontend/src/components/Player/index.tsx` (suppression de la cascade `Entry`)
- Modify: `apps/frontend/src/components/Player/TrackMeta.tsx`
- Modify: `apps/frontend/src/components/Player/TrackArtwork.tsx`
- Modify: `apps/frontend/src/components/Player/PlaybackControls.tsx`
- Modify: `apps/frontend/src/layout/Layout.tsx:54-65` (OnAirDot)
- Modify: `apps/frontend/src/index.css` (keyframe `breathe`, utilitaire `.press-ink`)

**Interfaces:**

- Consumes: `trackFlip`, `dataTick`, `toggle`, `modal` existants.
- Produces: `motion.ts` exporte désormais `trackFlip: Transition` (0.25s easeOut), `pageEntry: Transition` (0.6s easeOut), `dataTick`, `toggle`, `modal` (inchangés) et le hook `useInkFlip(): { initial, animate, exit, transition }`. `stagger` et `pressScale` n'existent plus. CSS : classe `animate-breathe` (respiration 4 s) et utilitaire `.press-ink` (fond qui fonce à l'appui).

- [ ] **Step 1: Réécrire `src/lib/motion.ts`**

```ts
import { useReducedMotion, type Transition } from 'motion/react';

// Single source of truth for the app's motion tokens. Importing from
// here avoids divergent durations / eases drifting across components.

// Page entry: one orchestrated fade, sky and content together. No
// translation, no stagger — the light comes up, nothing slides in.
export const pageEntry: Transition = {
  duration: 0.6,
  ease: 'easeOut',
};

// Track flip (sh_id change): "mise au net" — ink drying into focus.
export const trackFlip: Transition = {
  duration: 0.25,
  ease: 'easeOut',
};

// Data tick (listeners count, etc.).
export const dataTick: Transition = {
  duration: 0.25,
  ease: 'easeOut',
};

// Toggle (like, play/stop): gentle spring with low overshoot.
export const toggle: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 22,
};

// Modal / banner in-out.
export const modal: Transition = {
  duration: 0.3,
  ease: 'easeOut',
};

// Track-flip variants: crossfade + slight blur, no translation. Blur is
// not covered by MotionConfig's reducedMotion, so the hook gates it.
export function useInkFlip() {
  const reduced = useReducedMotion();
  if (reduced) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 } satisfies Transition,
    };
  }
  return {
    initial: { opacity: 0, filter: 'blur(3px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(3px)' },
    transition: trackFlip,
  };
}
```

- [ ] **Step 2: Ajouter keyframe et utilitaire dans `src/index.css`**

Dans `@theme`, ajouter :

```css
--animate-breathe: breathe 4s ease-in-out infinite;
```

Après le bloc `@keyframes pulse-soft`, ajouter :

```css
@keyframes breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
```

Dans `@layer utilities`, ajouter :

```css
/* Retour d'encre à l'appui — remplace tout scale au tap */
.press-ink:active {
  background: color-mix(in srgb, var(--ink) 10%, var(--paper));
}
```

- [ ] **Step 3: Remplacer la cascade `Entry` dans `Player/index.tsx`**

Supprimer la fonction `Entry` et l'import `{ trackFlip, stagger }` (remplacé par `{ pageEntry }`). Le rendu `hasData` devient un seul wrapper animé :

```tsx
return (
  <motion.div
    className="h-full min-h-0 grid grid-rows-[1fr_auto] grid-cols-[minmax(0,1fr)]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={pageEntry}
  >
    <div className="min-h-0 min-w-0 grid grid-rows-[minmax(0,1fr)_auto]">
      <div className="min-h-0 min-w-0 overflow-y-auto lg:overflow-visible flex flex-col">
        <div className="my-auto w-full min-w-0 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,42%)_1fr] lg:items-center lg:gap-12">
          <TrackArtwork />
          <div className="min-w-0 flex flex-col gap-3 lg:gap-5">
            <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
            <Timeline />
            <ControlsRow className="hidden lg:flex items-center" />
          </div>
        </div>
      </div>
      <ControlsRow className="pt-5 lg:hidden flex items-center" />
    </div>
    <RecentRail />
    <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />
  </motion.div>
);
```

Le squelette (`!hasData`) garde sa structure actuelle sans wrapper animé. Attention : `ControlsRow` reçoit désormais les classes de visibilité (`hidden lg:flex`, `lg:hidden flex`) directement — supprimer les anciens wrappers `Entry`.

- [ ] **Step 4: `TrackMeta.tsx` — mise au net sans translation ni délai**

Remplacer les imports motion (`trackFlip`, `stagger` → `useInkFlip`) puis les deux blocs animés :

```tsx
export function TrackMeta({ onArtistInfo }: TrackMetaProps) {
  const inkFlip = useInkFlip();
  const { shId, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      shId: s.data?.now_playing?.sh_id,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );

  return (
    <div className="min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        <motion.h2
          key={shId ?? 'waiting'}
          {...inkFlip}
          className="font-display text-title lg:text-display text-ink [text-wrap:balance]"
        >
          {title || 'Chargement du direct'}
        </motion.h2>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={artist ?? 'waiting'}
          {...inkFlip}
          className="mt-1 lg:mt-2 text-lead text-ink-soft"
        >
          {onArtistInfo && artist ? (
            <button
              onClick={onArtistInfo}
              className="cursor-pointer underline decoration-line underline-offset-4 hover:decoration-ink transition-colors"
            >
              {artist}
            </button>
          ) : (
            (artist ?? '—')
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
```

(Le fallback « Chargement du direct » anticipe la Task 5 — le poser dès maintenant évite un double passage sur ce fichier.)

- [ ] **Step 5: `TrackArtwork.tsx` — blur sur l'image, retour d'encre sur les boutons**

- Import : retirer `pressScale`, ajouter `useInkFlip`.
- Dans le composant : `const inkFlip = useInkFlip();`
- `motion.img` : remplacer `initial/animate/exit/transition` par `{...inkFlip}`.
- Les deux `motion.button` (share, like) redeviennent des `<button>` natifs : retirer `whileTap`/`transition`, ajouter la classe `press-ink` à côté de `bg-paper/90`. Exemple pour share :

```tsx
<button
  onClick={handleShare}
  className={cn(
    'flex size-10 items-center justify-center rounded-full cursor-pointer',
    'bg-paper/90 border border-line text-ink-faint hover:text-ink transition-colors press-ink'
  )}
  title="Partager"
  aria-label="Partager ce morceau"
>
  <Share2 className="size-4" />
</button>
```

Le `motion.span` interne du like (pop du cœur, `toggleTransition`) est conservé.

- [ ] **Step 6: `PlaybackControls.tsx` — plus de scale au tap**

Retirer `whileTap={{ scale: pressScale }}` et l'import de `pressScale` ; le `whileHover={{ scale: 1.05 }}` est retiré aussi (même famille de gestes) ; ajouter `active:brightness-90` aux classes du bouton accent :

```tsx
    <motion.button
      onClick={togglePlay}
      transition={toggleTransition}
      className={cn(
        'size-14 lg:size-16 rounded-full flex items-center justify-center shrink-0 cursor-pointer',
        'bg-accent text-on-accent hover:opacity-90 active:brightness-90'
      )}
      aria-label={isPlaying ? 'Arrêter la lecture' : 'Lancer la lecture'}
      aria-pressed={isPlaying}
    >
```

(Le `motion.button` reste : l'`AnimatePresence` interne play/stop en dépend.)

- [ ] **Step 7: `Layout.tsx` — respiration du témoin d'antenne**

Dans `OnAirDot`, remplacer `isPlaying && 'animate-pulse'` par `isPlaying && 'animate-breathe'`. Les autres `animate-pulse` (LIVE, états `isLiking`/`isDeleting`) sont des retours d'action fonctionnels : conservés.

- [ ] **Step 8: Vérifier l'éradication des presets supprimés + santé**

Run :

```bash
grep -rn "pressScale\|stagger\|whileTap" apps/frontend/src --include="*.tsx" --include="*.ts" | grep -v test
pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint && pnpm --filter @aubesonore/frontend test -- --run
```

Expected: grep vide ; tout passe. Contrôle visuel : entrée de page = fondu unique sans glissement ; changement de piste = léger blur→net ; appui sur les boutons = assombrissement, aucun scale ; point de marque = respiration lente. Avec « réduire les animations » activé dans l'OS : aucun mouvement.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/lib/motion.ts apps/frontend/src/index.css apps/frontend/src/components/Player/index.tsx apps/frontend/src/components/Player/TrackMeta.tsx apps/frontend/src/components/Player/TrackArtwork.tsx apps/frontend/src/components/Player/PlaybackControls.tsx apps/frontend/src/layout/Layout.tsx
git commit -m "feat(frontend): replace fade-up cascade with ink-based motion language"
```

---

### Task 5: Copy — une seule ligne qui chante

**Files:**

- Modify: `apps/frontend/src/lib/moments.ts:26-31`
- Modify: `apps/frontend/src/components/Player/ListenersBadge.tsx:70` (et sa branche)
- Modify: `apps/frontend/src/components/Player/RecentRail.tsx:154-161`
- Modify: `apps/frontend/src/components/AboutModal.tsx:25-29`

**Interfaces:**

- Consumes: `TrackMeta` déjà traité en Task 4 (« Chargement du direct »).
- Produces: aucune API — chaînes uniquement. `MOMENT_SHARE_PHRASES` inchangé.

- [ ] **Step 1: Resserrer la tagline aube dans `moments.ts`**

```ts
export const MOMENT_TAGLINES: Record<Moment, string> = {
  dawn: 'Le jour se lève sur ce qui restait dans l’ombre.',
  day: 'Plein jour sur les morceaux qui le méritent.',
  dusk: 'La lumière descend, l’écoute se resserre.',
  night: 'La nuit veille sur les découvertes de demain.',
};
```

- [ ] **Step 2: `ListenersBadge.tsx` — zéro auditeur = même rendu que n > 0**

Localiser la branche qui affiche `<span className="hidden sm:inline italic">l&apos;antenne vous attend</span>` (ligne ~70) : la supprimer pour que le cas `current === 0` passe par le rendu standard icône + compteur (« 0 »). Supprimer toute condition devenue morte autour.

- [ ] **Step 3: `RecentRail.tsx` — états fonctionnels**

Remplacer :

```tsx
          Historique partiel — actualisation impossible pour le moment.
```

par :

```tsx
          Historique momentanément indisponible.
```

et :

```tsx
          Le premier morceau de la journée s&apos;écrit en ce moment.
```

par :

```tsx
          Aucun morceau pour l&apos;instant.
```

- [ ] **Step 4: `AboutModal.tsx` — bio factuelle**

Remplacer le paragraphe lyrique par :

```tsx
<p className="text-body text-ink-soft leading-relaxed">
  AubeSonore diffuse des sons rares, des artistes émergents et des classiques oubliés. Les couleurs
  du site suivent la lumière du jour, de l&apos;aube à la nuit.
</p>
```

- [ ] **Step 5: Vérifier qu'aucune poésie orpheline ne subsiste + santé**

Run :

```bash
grep -rn "antenne\|s'écrit\|se prépare" apps/frontend/src --include="*.tsx" | grep -v test
pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint && pnpm --filter @aubesonore/frontend test -- --run
```

Expected: seuls des libellés fonctionnels restent (aria-labels de bibliothèque, commentaire du témoin d'antenne) ; tout passe.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/lib/moments.ts apps/frontend/src/components/Player/ListenersBadge.tsx apps/frontend/src/components/Player/RecentRail.tsx apps/frontend/src/components/AboutModal.tsx
git commit -m "feat(frontend): reduce UI copy to a single poetic voice"
```

---

### Task 6: Radius, page de référence, captures et vérification finale

**Files:**

- Modify: `apps/frontend/src/index.css:77-80` (échelle radius)
- Test: captures des 4 moments + critères d'acceptation spec §8

**Interfaces:**

- Consumes: tout ce qui précède.
- Produces: état final vérifié, prêt pour revue.

- [ ] **Step 1: Resserrer l'échelle de radius**

Dans `@theme` :

```css
--radius-sm: 0.125rem;
--radius-md: 0.25rem;
--radius-lg: 0.5rem;
```

Contrôle visuel sur `/dev/system` : boutons nets sans être vifs, panneau discret, plus de look pilule sur « Connexion ». Les pastilles `rounded-full` sur pochette ne bougent pas (hors échelle, voulu).

- [ ] **Step 2: Captures des quatre moments**

Dev server lancé, depuis la racine :

```bash
C=$HOME/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome
for m in dawn day dusk night; do
  "$C" --headless --no-sandbox --disable-gpu --window-size=1440,900 --hide-scrollbars \
    --virtual-time-budget=9000 --screenshot="/tmp/second-impression-$m.png" \
    "http://localhost:5173/?moment=$m" 2>/dev/null
done
```

Examiner les quatre captures (outil Read). Expected: aucun des trois clusters IA (crème+serif contrastée+terracotta ; sombre à accent acide unique ; broadsheet zéro-radius) ; dégradé de ciel perceptible en haut de page.

- [ ] **Step 3: Dérouler les critères d'acceptation de la spec (§8)**

Run :

```bash
pnpm typecheck && pnpm lint
pnpm --filter @aubesonore/frontend test -- --run
node apps/frontend/scripts/check-contrast.mjs
grep -rniE "fraunces|fontsource/inter|'inter'" apps/frontend/src apps/frontend/package.json
```

Expected: tout vert, grep vide, contrastes OK. Vérifier `prefers-reduced-motion` (émulation OS ou DevTools) : zéro animation.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/index.css
git commit -m "feat(frontend): tighten radius scale for the second impression"
```

- [ ] **Step 5: Mettre à jour la charte mémoire**

Mettre à jour `/home/victormoi/.claude/projects/-home-victormoi-AubeSonore/memory/design-system-papier-du-moment.md` : Young Serif/Spectral à la place de Fraunces/Inter, nouvelles palettes aube/crépuscule, token `--sky`, presets `pageEntry`/`useInkFlip` à la place de la cascade/`pressScale`, radius 2/4/8 px, règle « une seule ligne poétique ». (Étape pour l'orchestrateur, pas pour un subagent — la mémoire est hors repo.)
