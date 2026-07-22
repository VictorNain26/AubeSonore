# Player Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le player now-playing en « manchette + fil d'onde » : play hors cover, titre robuste, barre d'actions unifiée à icônes agrandies, waveform pleine largeur/lissée, bouton play/stop révisé.

**Architecture:** On conserve la séparation vue (design system, props-in) / container (store). Le play sort de la cover et devient l'ancre d'une ligne de transport (`play + waveform`) recomposée dans `Player/index.tsx`. Les actions like/partage quittent `TrackMeta` pour un nouveau couple `TrackActions(View)` regroupé avec le volume dans une barre d'actions.

**Tech Stack:** React 19, Tailwind v4 (`@theme` tokens), motion/react, lucide-react, Vitest + Testing Library, Storybook.

## Global Constraints

- Tokens uniquement : aucune couleur/espacement/typo/rayon hors `src/design/tokens.css`. Vocabulaire couleur limité (`bg-surface`, `text-text`, `text-text-muted`, `bg-accent`, `text-on-accent`, `border-border`, …).
- Pas de valeurs arbitraires pour color/spacing/typo (`bg-[#..]`, `p-[13px]`, `text-[17px]`). Transforms standard autorisées (`scale-105`).
- Typo : uniquement `text-display`, `text-title`, `text-lead`, `text-body`, `text-caption`. Radii : `rounded-sm|md|full`.
- A11y : cibles ≥44px, `focus-visible` sur tout interactif, `aria-*` corrects, canvas `aria-hidden`. Contraste AA les 2 thèmes.
- Motion décoratif seulement sous `prefers-reduced-motion: no-preference` (variant `motion-safe:`), 150–250ms, `ease-out-quart`.
- Commits Conventional Commits en anglais, scope `frontend`. Stage explicite (`git add <file>`), jamais `-A`.
- Chaque vue design touchée garde sa story colocalisée (tous états × 2 thèmes, addon-a11y clean).
- Vérif finale : `pnpm typecheck && pnpm lint` verts, `pnpm test` vert sur modules touchés, `node scripts/check-contrast.mjs` vert.

Tous les chemins sont relatifs à `apps/frontend/`.

---

### Task 1: Bouton play/stop révisé

**Files:**

- Modify: `src/design/molecules/PlaybackControls.tsx`
- Modify: `src/design/molecules/PlaybackControls.stories.tsx` (vérif visuelle des 2 états × 2 thèmes)

**Interfaces:**

- Consumes: `PlaybackControlsViewProps { isPlaying: boolean; onTogglePlay: () => void }` (inchangé)
- Produces: même interface — c'est une révision visuelle interne.

- [ ] **Step 1: Remplacer le corps de `PlaybackControlsView`**

```tsx
export function PlaybackControlsView({ isPlaying, onTogglePlay }: PlaybackControlsViewProps) {
  return (
    <m.button
      onClick={onTogglePlay}
      transition={toggleTransition}
      className={cn(
        'size-14 rounded-full flex items-center justify-center shrink-0 cursor-pointer',
        'bg-accent text-on-accent transition duration-200 ease-out-quart',
        'hover:opacity-90 active:opacity-80 motion-safe:hover:scale-105 motion-safe:active:scale-95',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
      )}
      aria-label={isPlaying ? 'Arrêter la lecture' : 'Lancer la lecture'}
      aria-pressed={isPlaying}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isPlaying ? (
          <m.span
            key="stop"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={toggleTransition}
          >
            <Square className="size-5 fill-current" strokeWidth={0} />
          </m.span>
        ) : (
          <m.span
            key="play"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={toggleTransition}
          >
            <Play className="size-6 ml-0.5 fill-current" strokeWidth={0} />
          </m.span>
        )}
      </AnimatePresence>
    </m.button>
  );
}
```

Changements : icônes **pleines** (`fill-current strokeWidth={0}`) au lieu des outlines fins ; taille **constante `size-14`** (retire `lg:size-16`) pour ancrer le fil ; micro-interaction tactile `motion-safe:hover:scale-105 motion-safe:active:scale-95`.

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint`
Expected: 0 error.

- [ ] **Step 3: Vérif visuelle dans Storybook**

Ouvrir la story `PlaybackControls` (états Playing/Stopped, 2 thèmes via toolbar Thème). Vérifier : glyphes pleins bien lisibles sur l'accent, focus-visible net, addon-a11y clean. Ajuster la story si un état manque.

- [ ] **Step 4: Commit**

```bash
git add src/design/molecules/PlaybackControls.tsx src/design/molecules/PlaybackControls.stories.tsx
git commit -m "feat(frontend): revise play/stop button (filled glyphs, tactile feedback)"
```

---

### Task 2: Titre robuste (line-clamp + title)

**Files:**

- Modify: `src/design/organisms/TrackMeta.tsx`
- Create: `src/design/organisms/TrackMeta.test.tsx`

**Interfaces:**

- Consumes: `TrackMetaViewProps` (inchangé dans cette tâche — les actions restent en place ; elles seront retirées en Task 5).
- Produces: le `<h2>` du titre porte `line-clamp-2` + `title={title}`.

- [ ] **Step 1: Écrire le test qui échoue**

`src/design/organisms/TrackMeta.test.tsx` :

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrackMetaView } from './TrackMeta';

const inkFlip = { initial: {}, animate: {}, exit: {}, transition: {} } as never;
const base = {
  inkFlip,
  artist: 'Some Artist',
  shId: 1,
  isLiked: false,
  isLiking: false,
  onToggleLike: () => {},
  onShare: () => {},
};

describe('TrackMetaView', () => {
  it('exposes the full title via the title attribute and clamps it', () => {
    const long = 'A Very Long Track Title That Would Otherwise Wrap Across Many Lines';
    render(<TrackMetaView {...base} title={long} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveAttribute('title', long);
    expect(heading.className).toContain('line-clamp-2');
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `pnpm --filter @aubesonore/frontend test --run src/design/organisms/TrackMeta.test.tsx`
Expected: FAIL (pas d'attribut `title`, pas de classe `line-clamp-2`).

- [ ] **Step 3: Modifier le `<m.h2>` de `TrackMetaView`**

```tsx
<m.h2
  key={shId ?? 'waiting'}
  {...inkFlip}
  title={title || undefined}
  className="font-display text-title lg:text-display font-medium text-text [text-wrap:balance] line-clamp-2"
>
  {title || 'Chargement du direct'}
</m.h2>
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `pnpm --filter @aubesonore/frontend test --run src/design/organisms/TrackMeta.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design/organisms/TrackMeta.tsx src/design/organisms/TrackMeta.test.tsx
git commit -m "feat(frontend): clamp long track titles to two lines with full title tooltip"
```

---

### Task 3: Waveform — helper pur (amplitude homogène + respiration) et intégration

**Files:**

- Create: `src/lib/waveform.ts`
- Create: `src/lib/waveform.test.ts`
- Modify: `src/components/Player/WaveformCanvas.tsx`
- Modify: `src/design/organisms/WaveformCanvas.tsx` (hauteur)

**Interfaces:**

- Produces:
  - `sampleBin(index: number, pointsCount: number, startBin: number, endBin: number): number` — mapping linéaire index→bin, réparti sur toute la largeur (pas d'atténuation centrale).
  - `waveOffset(value: number, index: number, time: number, isPlaying: boolean): number` — décalage vertical normalisé ; en lecture proportionnel à `value`, au repos une respiration basse amplitude homogène.
- Consumes: `WaveformCanvas` importe ces deux fonctions.

- [ ] **Step 1: Écrire le test qui échoue**

`src/lib/waveform.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { sampleBin, waveOffset } from './waveform';

describe('sampleBin', () => {
  it('spreads bins linearly across the whole width, without a centre bias', () => {
    const pts = 72;
    expect(sampleBin(0, pts, 2, 35)).toBe(2);
    expect(sampleBin(pts - 1, pts, 2, 35)).toBe(34);
    // monotone croissant
    let prev = -1;
    for (let i = 0; i < pts; i++) {
      const b = sampleBin(i, pts, 2, 35);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });
});

describe('waveOffset', () => {
  it('at rest breathes at low, non-zero, homogeneous amplitude', () => {
    const atCenter = Math.abs(waveOffset(0.3, 36, 1.0, false));
    const atEdge = Math.abs(waveOffset(0.3, 71, 1.0, false));
    expect(atCenter).toBeLessThanOrEqual(0.12);
    // homogène : le bord n'est pas atténué par rapport au centre
    const maxRest = Math.max(
      ...Array.from({ length: 72 }, (_, i) => Math.abs(waveOffset(0.3, i, 1.0, false)))
    );
    expect(maxRest).toBeGreaterThan(0.02);
    expect(atEdge).toBeLessThanOrEqual(maxRest);
  });

  it('while playing scales with the sampled value', () => {
    const loud = Math.abs(waveOffset(0.9, 10, 0.5, true));
    const quiet = Math.abs(waveOffset(0.2, 10, 0.5, true));
    expect(loud).toBeGreaterThan(quiet);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `pnpm --filter @aubesonore/frontend test --run src/lib/waveform.test.ts`
Expected: FAIL (module `./waveform` introuvable).

- [ ] **Step 3: Créer `src/lib/waveform.ts`**

```ts
// Géométrie du tracé d'antenne (« le fil »). Fonctions pures, testables sans
// canvas. L'onde n'est pas une timeline : chaque point est traité pareil,
// amplitude homogène sur toute la largeur (aucun rétrécissement latéral).

/** Mappe un index de point sur une bande de fréquence, réparti linéairement. */
export function sampleBin(
  index: number,
  pointsCount: number,
  startBin: number,
  endBin: number
): number {
  const usableBins = endBin - startBin;
  const ratio = pointsCount > 1 ? index / (pointsCount - 1) : 0;
  return startBin + Math.floor(ratio * (usableBins - 1));
}

/** Décalage vertical normalisé [-1, 1] d'un point du tracé. */
export function waveOffset(value: number, index: number, time: number, isPlaying: boolean): number {
  if (isPlaying) {
    return (value - 0.15) * Math.sin(index * 0.85 + time * 2.2);
  }
  // Repos : respiration lente, basse amplitude, homogène (pas de badge LIVE).
  return 0.12 * Math.sin(index * 0.5 + time * 0.6);
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `pnpm --filter @aubesonore/frontend test --run src/lib/waveform.test.ts`
Expected: PASS.

- [ ] **Step 5: Intégrer dans `WaveformCanvas.tsx`**

Dans `src/components/Player/WaveformCanvas.tsx` :

1. Importer le helper en tête : `import { sampleBin, waveOffset } from '../../lib/waveform';`
2. Passer `const pointsCount = 72;` (densifier pour lisser).
3. Dans la boucle `for (let i = 0; i < pointsCount; i++)`, remplacer le bloc `startBin/endBin/distFromCenter/logDist/binOffset/binIndex` par :

```tsx
if (frequencyData) {
  const binIndex = sampleBin(i, pointsCount, 2, 35);
  const value = frequencyData[binIndex] ?? 0;
  const normalized = 0.15 + (value / 255) * 0.8;
  const smoothingFactor = 0.35;
  const prevValue = values[i] || 0.3;
  values[i] = prevValue * (1 - smoothingFactor) + normalized * smoothingFactor;
}

const currentValue = values[i] || 0.3;
const signed = waveOffset(currentValue, i, time, isPlaying);
const y = mid + signed * amplitude;
const x = i * stepX;
if (i === 0) ctx.moveTo(x, y);
else {
  const prevX = (i - 1) * stepX;
  const prevValuePt = values[i - 1] || 0.3;
  const prevSigned = waveOffset(prevValuePt, i - 1, time, isPlaying);
  const prevY = mid + prevSigned * amplitude;
  ctx.quadraticCurveTo(prevX + stepX / 2, (prevY + y) / 2, x, y);
}
```

Conserver tout le reste (rAF, refs, dpr/ResizeObserver, `strokeStyle` par état, `lineWidth`, visibilitychange). Note : au repos `waveOffset` renvoie désormais une respiration (≠ ligne plate), donc `strokeStyle` repos (30% alpha) trace une onde basse qui respire ; sous `reduce`, `timeRef` n'avance pas → onde figée (comportement voulu).

- [ ] **Step 6: Relever la hauteur du canvas**

Dans `src/design/organisms/WaveformCanvas.tsx`, passer la classe du canvas de `h-8` à `h-10` :

```tsx
return <canvas ref={canvasRef} className="w-full max-w-full h-10" aria-hidden="true" />;
```

- [ ] **Step 7: Typecheck + lint + test**

Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint && pnpm --filter @aubesonore/frontend test --run src/lib/waveform.test.ts`
Expected: 0 error, tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/waveform.ts src/lib/waveform.test.ts src/components/Player/WaveformCanvas.tsx src/design/organisms/WaveformCanvas.tsx
git commit -m "feat(frontend): homogeneous full-width waveform with resting breath"
```

---

### Task 4: `TrackActions` — like/partage à 20px (créé, pas encore branché)

**Files:**

- Create: `src/design/organisms/TrackActions.tsx`
- Create: `src/design/organisms/TrackActions.stories.tsx`
- Create: `src/design/organisms/TrackActions.test.tsx`
- Create: `src/components/Player/TrackActions.tsx`

**Interfaces:**

- Produces:
  - `TrackActionsViewProps { isLiked: boolean; isLiking: boolean; onToggleLike: () => void; onShare: () => void }`
  - `TrackActionsView(props)` — rangée partage + like, icônes `size-5`.
  - `TrackActions()` — container, lit `useTrackActions()`.

- [ ] **Step 1: Écrire le test qui échoue**

`src/design/organisms/TrackActions.test.tsx` :

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrackActionsView } from './TrackActions';

describe('TrackActionsView', () => {
  it('renders share + like, reflecting liked state', () => {
    render(
      <TrackActionsView isLiked isLiking={false} onToggleLike={() => {}} onShare={() => {}} />
    );
    expect(screen.getByLabelText('Partager ce morceau')).toBeInTheDocument();
    const like = screen.getByLabelText('Retirer de ma bibliothèque');
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like.className).toContain('text-accent');
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `pnpm --filter @aubesonore/frontend test --run src/design/organisms/TrackActions.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Créer `src/design/organisms/TrackActions.tsx`**

```tsx
import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../atoms/Button';

/** Presentational props for the now-playing action row. */
export interface TrackActionsViewProps {
  /** Whether the current track is in the user's library. */
  isLiked: boolean;
  /** Whether a like/unlike request is in flight. */
  isLiking: boolean;
  /** Toggles like state for the current track. */
  onToggleLike: () => void;
  /** Shares the current track. */
  onShare: () => void;
}

export function TrackActionsView({
  isLiked,
  isLiking,
  onToggleLike,
  onShare,
}: TrackActionsViewProps) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="icon" aria-label="Partager ce morceau" onClick={onShare}>
        <Share2 className="size-5" />
      </Button>
      <Button
        variant="icon"
        aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
        onClick={onToggleLike}
        aria-pressed={isLiked}
        disabled={isLiking}
        className={cn(isLiked ? 'text-accent' : undefined, isLiking && 'animate-pulse')}
      >
        <Heart className={cn('size-5', isLiked && 'fill-current')} />
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `pnpm --filter @aubesonore/frontend test --run src/design/organisms/TrackActions.test.tsx`
Expected: PASS.

- [ ] **Step 5: Créer le container `src/components/Player/TrackActions.tsx`**

```tsx
import { useTrackActions } from '../../hooks/player/useTrackActions';
import { TrackActionsView } from '../../design/organisms/TrackActions';

// Like + partage du morceau courant, regroupés dans la barre d'actions.
export function TrackActions() {
  const { isLiked, isLiking, handleToggleLike, handleShare } = useTrackActions();
  return (
    <TrackActionsView
      isLiked={isLiked}
      isLiking={isLiking}
      onToggleLike={handleToggleLike}
      onShare={handleShare}
    />
  );
}
```

- [ ] **Step 6: Créer la story `src/design/organisms/TrackActions.stories.tsx`**

Story CSF3 args-based (calquée sur les stories existantes du dossier `organisms/`) : `Default` (non liké), `Liked`, `Liking` (disabled/pulse), + `Showcase`. `tags: ['autodocs']`. Vérifier addon-a11y clean sur les 2 thèmes.

- [ ] **Step 7: Typecheck + lint**

Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint`
Expected: 0 error.

- [ ] **Step 8: Commit**

```bash
git add src/design/organisms/TrackActions.tsx src/design/organisms/TrackActions.stories.tsx src/design/organisms/TrackActions.test.tsx src/components/Player/TrackActions.tsx
git commit -m "feat(frontend): add TrackActions row with 20px like/share icons"
```

---

### Task 5: Recomposition du layout (manchette + fil d'onde)

**Files:**

- Modify: `src/design/organisms/TrackMeta.tsx` (retirer les actions like/partage)
- Modify: `src/components/Player/TrackMeta.tsx` (retirer `useTrackActions`)
- Modify: `src/design/organisms/SecondaryControls.tsx` (volume masqué mobile)
- Modify: `src/components/Player/index.tsx` (nouvelle composition + skeleton)
- Modify: `src/components/Player/index.test.tsx` (mock `TrackActions`)
- Modify: `src/design/organisms/TrackMeta.stories.tsx` (retirer les args d'actions)

**Interfaces:**

- `TrackMetaViewProps` devient `{ inkFlip; title; artist; shId; onArtistInfo? }` (retrait de `isLiked/isLiking/onToggleLike/onShare`).
- Consumes: `<TrackActions />` (Task 4), `<PlaybackControls />`, `<Antenna />`, `<SecondaryControls />`.

- [ ] **Step 1: Adapter le test `TrackMeta.test.tsx` (les actions quittent la vue)**

Dans `src/design/organisms/TrackMeta.test.tsx`, retirer de `base` les props `isLiked/isLiking/onToggleLike/onShare` (elles ne font plus partie de l'interface). Le test ne garde que la vérification titre `line-clamp-2` + `title`.

- [ ] **Step 2: Retirer les actions de `TrackMetaView`**

Nouveau `src/design/organisms/TrackMeta.tsx` (imports `Heart/Share2/Button/cn` supprimés) :

```tsx
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { useInkFlip } from '../../lib/motion';

/** Presentational props for the now-playing masthead (title + artist only). */
export interface TrackMetaViewProps {
  inkFlip: ReturnType<typeof useInkFlip>;
  title: string | undefined;
  artist: string | undefined;
  shId: number | undefined;
  onArtistInfo?: (() => void) | undefined;
}

export function TrackMetaView({ inkFlip, title, artist, shId, onArtistInfo }: TrackMetaViewProps) {
  return (
    <div className="min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        <m.h2
          key={shId ?? 'waiting'}
          {...inkFlip}
          title={title || undefined}
          className="font-display text-title lg:text-display font-medium text-text [text-wrap:balance] line-clamp-2"
        >
          {title || 'Chargement du direct'}
        </m.h2>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <m.p
          key={artist ?? 'waiting'}
          {...inkFlip}
          className="mt-1 lg:mt-2 text-lead text-text-muted"
        >
          {onArtistInfo && artist ? (
            <button
              onClick={onArtistInfo}
              className="cursor-pointer underline decoration-border underline-offset-4 hover:decoration-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-sm transition-colors"
            >
              {artist}
            </button>
          ) : (
            (artist ?? '—')
          )}
        </m.p>
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Simplifier le container `src/components/Player/TrackMeta.tsx`**

```tsx
import { useShallow } from 'zustand/react/shallow';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useInkFlip } from '../../lib/motion';
import { TrackMetaView } from '../../design/organisms/TrackMeta';

// The masthead: title + artist only. Actions moved to TrackActions.
interface TrackMetaProps {
  onArtistInfo?: (() => void) | undefined;
}

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
    <TrackMetaView
      inkFlip={inkFlip}
      title={title}
      artist={artist}
      shId={shId}
      {...(onArtistInfo ? { onArtistInfo } : {})}
    />
  );
}
```

- [ ] **Step 4: Masquer le volume en mobile (`SecondaryControls` view)**

`src/design/organisms/SecondaryControls.tsx` — wrapper le `VolumeControl` dans un conteneur `hidden lg:block` (AirPlay reste visible partout) :

```tsx
export function SecondaryControlsView({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: SecondaryControlsViewProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="hidden lg:block">
        <VolumeControl
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={onVolumeChange}
          onToggleMute={onToggleMute}
        />
      </div>
      <AirPlayButton />
    </div>
  );
}
```

- [ ] **Step 5: Recomposer `src/components/Player/index.tsx`**

Remplacer les constantes et les deux blocs (skeleton + data). Le play sort de la cover ; nouvelle ligne de transport `[PlaybackControls] + [Antenna flex-1]` ; barre d'actions `[TrackActions] + [SecondaryControls]`.

```tsx
import { useState } from 'react';
import * as m from 'motion/react-m';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { pageEntry } from '../../lib/motion';

import { TrackArtwork } from './TrackArtwork';
import { TrackMeta } from './TrackMeta';
import { Antenna } from './Antenna';
import { PlaybackControls } from './PlaybackControls';
import { TrackActions } from './TrackActions';
import { SecondaryControls } from './SecondaryControls';
import { ArtistContext } from './ArtistContext';
import { ArtistBio } from './ArtistBio';
import { RecentTracks } from './RecentTracks';

const NOW =
  'flex w-full max-w-3xl flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-10';
const META =
  'flex w-full min-w-0 flex-col items-center gap-4 text-center lg:items-start lg:text-left';
const TRANSPORT = 'flex w-full items-center gap-3 lg:gap-4';
const ACTIONS = 'flex items-center gap-2 justify-center lg:justify-start';

export default function Player() {
  const hasData = useNowPlayingStore((s) => s.data !== null);
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data } = useArtistInfo(artistName);
  const [artistPanelOpen, setArtistPanelOpen] = useState(false);
  const [prevArtistName, setPrevArtistName] = useState(artistName);

  if (artistName !== prevArtistName) {
    setPrevArtistName(artistName);
    setArtistPanelOpen(false);
  }

  if (!hasData) {
    return (
      <div className="grid h-full grid-rows-[1fr_auto] overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col items-center justify-center px-6 py-4">
          <div className={NOW}>
            <div className="artwork-size shrink-0">
              <div className="aspect-square rounded-md animate-pulse bg-surface-raised" />
            </div>
            <div className={META}>
              <div className="h-9 w-3/4 animate-pulse rounded-sm bg-surface-raised" />
              <div className="h-5 w-1/3 animate-pulse rounded-sm bg-surface-raised" />
              <div className={TRANSPORT}>
                <div className="size-14 shrink-0 animate-pulse rounded-full bg-surface-raised" />
                <div className="h-10 flex-1 animate-pulse rounded-sm bg-surface-raised" />
              </div>
            </div>
          </div>
        </div>
        <RecentTracks />
      </div>
    );
  }

  return (
    <m.div
      className="grid h-full grid-rows-[1fr_auto] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={pageEntry}
    >
      <div className="flex min-h-0 min-w-0 flex-col items-center justify-center px-6 py-4">
        <div className={NOW}>
          <div className="artwork-size shrink-0">
            <TrackArtwork />
          </div>
          <div className={META}>
            <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
            <div className={TRANSPORT}>
              <PlaybackControls />
              <div className="min-w-0 flex-1">
                <Antenna />
              </div>
            </div>
            <div className={ACTIONS}>
              <TrackActions />
              <SecondaryControls />
            </div>
            <div className="hidden lg:block">
              <ArtistBio onOpenPanel={() => setArtistPanelOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      <RecentTracks />

      <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />
    </m.div>
  );
}
```

- [ ] **Step 6: Mettre à jour `index.test.tsx`**

Ajouter le mock du nouveau container (les autres mocks restent). Insérer après le mock `PlaybackControls` :

```tsx
vi.mock('./TrackActions', () => ({
  TrackActions: () => <div data-testid="track-actions">Actions</div>,
}));
```

Les assertions existantes (`artwork`, `meta`, `antenna`, `controls`, `secondary`, `artist-bio`, `recent-tracks`) restent valides. Optionnel : ajouter `expect(screen.getByTestId('track-actions')).toBeInTheDocument();` dans le test « renders all main sections ».

- [ ] **Step 7: Mettre à jour `TrackMeta.stories.tsx`**

Retirer des `args`/`meta` toute prop d'action (`isLiked`, `isLiking`, `onToggleLike`, `onShare`). Ne conserver que `inkFlip`, `title`, `artist`, `shId`, `onArtistInfo`. Garder une story `LongTitle` (titre ≥40 caractères) pour documenter le clamp.

- [ ] **Step 8: Typecheck + lint + tests player**

Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint && pnpm --filter @aubesonore/frontend test --run src/components/Player src/design/organisms/TrackMeta.test.tsx`
Expected: 0 error, tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/design/organisms/TrackMeta.tsx src/design/organisms/TrackMeta.test.tsx src/design/organisms/TrackMeta.stories.tsx src/components/Player/TrackMeta.tsx src/design/organisms/SecondaryControls.tsx src/components/Player/index.tsx src/components/Player/index.test.tsx
git commit -m "feat(frontend): recompose player as masthead with transport line and action bar"
```

---

### Task 6: Vérification visuelle globale + stories

**Files:**

- Modify (si besoin): stories touchées (`PlaybackControls`, `WaveformCanvas`/`Antenna`, `TrackActions`, `TrackMeta`, `SecondaryControls`)

- [ ] **Step 1: Suite complète frontend**

Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint && pnpm --filter @aubesonore/frontend test --run`
Expected: 0 error, 0 warning, tous les tests PASS.

- [ ] **Step 2: Contraste AA**

Run: `node apps/frontend/scripts/check-contrast.mjs`
Expected: PASS (aucune nouvelle paire de tokens introduite).

- [ ] **Step 3: Vérification visuelle (screenshots CDP)**

Lancer `pnpm --filter @aubesonore/frontend dev` (port 5173), capturer **2 thèmes × 2 viewports** (1280×800 / 390×844) via chrome-headless-shell en CDP brut (cf. [[design-verification-loop]]), **à l'arrêt et en lecture** (forcer play). Vérifier, sur chaque capture :

1. Aucun bouton ne chevauche la cover.
2. Ligne de transport : play `size-14` ancré à gauche, onde pleine largeur à droite, amplitude homogène, courbe lisse (plus de « carré »), respiration visible au repos.
3. Barre d'actions : like/partage à 20px, volume présent desktop / absent mobile.
4. Titre : tester un morceau à titre long (ou forcer via un mock) → borné 2 lignes, ellipsis, layout intact.
5. Cohérence des 2 thèmes.

- [ ] **Step 4: Storybook — addon-a11y**

Ouvrir chaque story touchée, vérifier addon-a11y clean sur les 2 thèmes (toolbar Thème). Corriger toute violation.

- [ ] **Step 5: Commit final (si ajustements)**

```bash
git add -p
git commit -m "chore(frontend): polish player stories and visual states"
```

---

## Notes d'exécution

- **Hors scope** (YAGNI) : pas d'état buffering/loading dans le store ; pas de refonte de `RecentTracks`/`ArtistContext`/header ; pas de nouveaux tokens.
- **Revue avant merge** : revue indépendante adversariale (fresh eyes) sur le diff réel avant d'ouvrir la PR (cf. cadence tech-lead). Ajouter un test de non-régression si un bug est trouvé.
