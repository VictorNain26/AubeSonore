# Live Page Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the live page around the « manchette » layout and fix every design/UX gap listed in `docs/superpowers/specs/2026-07-20-live-page-design.md` to reach a 9.5/10 design.

**Architecture:** Pure frontend work in `apps/frontend`. The Player composition root (`src/components/Player/index.tsx`) is re-arranged (no new data flow); action logic moves into a shared hook; tokens stay in `src/index.css`. Each task is one short-lived PR merged when green (main-first).

**Tech Stack:** React 19.2, Vite 8, Tailwind 4 (CSS-first tokens), Zustand 5, Radix, motion 12, Vitest 3 + Testing Library.

## Global Constraints

- Identity untouched: « papier du moment » concept, Spectral + Young Serif, existing motion tokens (`src/lib/motion.ts`), zero blur, `.press-ink` instead of scale.
- Product hierarchy: 1 écouter, 2 découvrir, 3 partager, 4 réécouter sur sa plateforme. Anything else gets removed (ex: listener count).
- Zero hardcoded values: colors/spacing/radius via tokens from `src/index.css`.
- All interactive targets >= 44px touch; WCAG AA contrast (4.5:1); keyboard reachable; `prefers-reduced-motion` respected.
- No comments in new code unless a non-obvious WHY. Named exports. No `eslint-disable`.
- Every task ends with: `pnpm typecheck && pnpm lint && pnpm test` all green, plus the screenshot loop for visual tasks (see below), then commit + PR (Conventional Commits, English). Never push to master.
- Screenshot loop (visual verification, run from `apps/frontend` with dev server on :5199):

```bash
CHROME=~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome
for m in night dawn day dusk; do
  "$CHROME" --headless=new --disable-gpu --no-sandbox --window-size=1440,900 --hide-scrollbars \
    --virtual-time-budget=12000 --screenshot="/tmp/shot-desktop-$m.png" "http://localhost:5199/?moment=$m"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --window-size=390,844 --hide-scrollbars \
    --virtual-time-budget=12000 --screenshot="/tmp/shot-mobile-$m.png" "http://localhost:5199/?moment=$m"
done
```

Read each PNG and check the task's acceptance criteria before claiming done.

---

### Task 1: Manchette — recompose the « direct » column

**Files:**

- Modify: `src/components/Player/index.tsx`
- Modify: `src/components/Player/AntennaStatus.tsx`
- Modify: `src/components/Player/TrackArtwork.tsx`
- Modify: `src/components/Player/TrackMeta.tsx`
- Modify: `src/components/Player/Antenna.tsx`
- Modify: `src/components/Player/ArtistContext.tsx`
- Create: `src/hooks/player/useTrackActions.ts`
- Create: `src/components/Player/ArtistBio.tsx`
- Test: `src/components/Player/AntennaStatus.test.tsx`, `src/components/Player/Antenna.test.tsx`, `src/components/Player/ArtistBio.test.tsx`

**Interfaces:**

- Consumes: `useNowPlayingStore`, `usePlayer`, `useArtistInfo(artistName)` (returns `{ data: { bio, tags, similarArtists } | null, isLoading }`), `useLikeAction`, `shareTrack`, existing motion tokens.
- Produces: `useTrackActions(): { title, artist, isLiked, isLiking, handleToggleLike, handleShare }` (used by TrackMeta now, reusable later); `ArtistBio({ onOpenPanel }: { onOpenPanel: () => void })`.

- [ ] **Step 1: Write failing tests for AntennaStatus (permanent live line, no listener count)**

`src/components/Player/AntennaStatus.test.tsx` (mock the store the same way as `src/lib/azuracast/store.test.ts` does — set state directly):

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useNowPlayingStore } from '../../lib/azuracast';
import { AntennaStatus } from './AntennaStatus';

const base = {
  now_playing: { sh_id: 1, played_at: 0, song: { title: 'T', artist: 'A', art: '' } },
  listeners: { current: 12 },
  live: { is_live: false, streamer_name: '', broadcast_start: null },
};

describe('AntennaStatus', () => {
  beforeEach(() => {
    useNowPlayingStore.setState({ data: structuredClone(base) });
  });

  it('always shows the live line, even without a DJ', () => {
    render(<AntennaStatus />);
    expect(screen.getByText('En direct')).toBeInTheDocument();
  });

  it('never shows the listener count', () => {
    render(<AntennaStatus />);
    expect(screen.queryByText(/à l'écoute/)).not.toBeInTheDocument();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });

  it('shows DJ name when live', () => {
    useNowPlayingStore.setState({
      data: {
        ...structuredClone(base),
        live: { is_live: true, streamer_name: 'DJ X', broadcast_start: null },
      },
    });
    render(<AntennaStatus />);
    expect(screen.getByText(/DJ X/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail** — `pnpm test -- AntennaStatus` → FAIL (component returns `null` without live/listeners, and count renders).

- [ ] **Step 3: Rewrite AntennaStatus** — replace the whole component body (keep `formatElapsed`/`useBroadcastElapsed` as-is, drop `Users`, `motion`, `dataTick`, `AnimatePresence` imports and the listeners selector):

```tsx
export function AntennaStatus() {
  const { isLive, streamerName, broadcastStart } = useNowPlayingStore(
    useShallow((s) => ({
      isLive: s.data?.live?.is_live ?? false,
      streamerName: s.data?.live?.streamer_name ?? '',
      broadcastStart: s.data?.live?.broadcast_start ?? null,
    }))
  );

  const elapsed = useBroadcastElapsed(isLive && streamerName ? broadcastStart : null);

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-faint"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="flex items-center gap-1.5 font-medium text-danger">
        <span className="size-1.5 rounded-full bg-danger animate-pulse" />
        En direct
      </span>
      {isLive && streamerName && <span className="text-ink-soft">· {streamerName}</span>}
      {isLive && elapsed && <span>· depuis {elapsed}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests** — `pnpm test -- AntennaStatus` → PASS.

- [ ] **Step 5: Extract `useTrackActions`** — create `src/hooks/player/useTrackActions.ts` by moving the like/share logic out of `TrackArtwork.tsx:22-72` verbatim (same imports):

```tsx
import { useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { useLikeAction } from './useLikeAction';
import { useMoment } from '../useMoment';
import { shareTrack } from '../../lib/shareTrack';
import { MOMENT_SHARE_PHRASES } from '../../lib/moments';

export function useTrackActions() {
  const { artUrl, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      artUrl: s.data?.now_playing?.song.art,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );
  const moment = useMoment();
  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();

  const isLiked = title && artist ? isTrackLiked(tracks, title, artist) : false;
  const isLiking = likingTrackId === `${title}-${artist}`;

  const trackUrl = useMemo(() => {
    if (!title || !artist) return undefined;
    const likedTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === title.toLowerCase() &&
        t.artist.toLowerCase() === artist.toLowerCase()
    );
    return getTrackShareUrl(likedTrack ?? { title, artist }, preferences?.preferredPlatform);
  }, [title, artist, tracks, preferences]);

  const handleToggleLike = useCallback(() => {
    if (title && artist) void toggleLike(title, artist, artUrl);
  }, [title, artist, artUrl, toggleLike]);

  const handleShare = useCallback(() => {
    if (!title || !artist || !trackUrl) return;
    void shareTrack({ title, artist, url: trackUrl, momentLabel: MOMENT_SHARE_PHRASES[moment] })
      .then((r) => {
        if (r === 'copied') toast('Lien copié');
      })
      .catch(() => {
        toast('Partage impossible');
      });
  }, [title, artist, trackUrl, moment]);

  return { title, artist, isLiked, isLiking, handleToggleLike, handleShare };
}
```

- [ ] **Step 6: Slim TrackArtwork** — remove the whole `{title && (...)}` overlay block (lines 103-140) and every import/variable it alone used (`Heart`, `Share2`, `toast`, stores, `useLikeAction`, `useMoment`, `shareTrack`, `MOMENT_SHARE_PHRASES`, `getTrackShareUrl`, `toggleTransition`, `trackUrl`, handlers). Keep artwork rendering, `isDefaultCover`, `inkFlip`, playing scale.

- [ ] **Step 7: TrackMeta gains the actions row** — after the artist `<AnimatePresence>` block in `TrackMeta.tsx`, add (using `IconButton` from `../ui/Button` and `useTrackActions`):

```tsx
<div className="mt-2 flex items-center gap-1">
  <IconButton label="Partager ce morceau" onClick={handleShare} shape="round">
    <Share2 className="size-4" />
  </IconButton>
  <IconButton
    label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
    onClick={handleToggleLike}
    shape="round"
    aria-pressed={isLiked}
    disabled={isLiking}
    className={cn(isLiked ? 'text-danger' : undefined, isLiking && 'animate-pulse')}
  >
    <Heart className={cn('size-4', isLiked && 'fill-current')} />
  </IconButton>
</div>
```

(Check `IconButton`'s actual props in `src/components/ui/Button.tsx` first; if it doesn't forward `aria-pressed`/`className`, extend it there. Task 6 raises its size to 44px for everyone.)

- [ ] **Step 8: Antenna idle state** — in `Antenna.tsx`, render the canvas only while playing:

```tsx
export function Antenna() {
  const shId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const isPlaying = usePlayer((s) => s.isPlaying);

  if (!isPlaying) {
    return (
      <p className="text-caption text-ink-soft">Appuyez sur lecture pour écouter le direct.</p>
    );
  }
  return (
    <div className="w-full min-w-0">
      <WaveformCanvas isPlaying={isPlaying} songId={shId} />
    </div>
  );
}
```

Test `src/components/Player/Antenna.test.tsx`: with `usePlayer.setState({ isPlaying: false })` expect the idle text and no `canvas`; with `isPlaying: true` expect a `canvas` (mock `WaveformCanvas` if AnalyserNode breaks jsdom: `vi.mock('./WaveformCanvas', () => ({ WaveformCanvas: () => <canvas data-testid="wave" /> }))`).

- [ ] **Step 9: Create ArtistBio (the inhabited void)** — `src/components/Player/ArtistBio.tsx`:

```tsx
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';

export function ArtistBio({ onOpenPanel }: { onOpenPanel: () => void }) {
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data, isLoading } = useArtistInfo(artistName);

  if (!artistName) return null;
  if (isLoading) {
    return (
      <div className="flex max-w-prose flex-col gap-2" aria-hidden="true">
        <div className="h-4 w-full skeleton" />
        <div className="h-4 w-5/6 skeleton" />
        <div className="h-4 w-2/3 skeleton" />
      </div>
    );
  }
  if (!data?.bio) return null;

  return (
    <div className="max-w-prose">
      <p className="text-body text-ink-soft leading-relaxed line-clamp-3">{data.bio}</p>
      <button
        onClick={onOpenPanel}
        className="mt-1 cursor-pointer text-caption text-ink-faint underline decoration-line underline-offset-4 hover:decoration-ink transition-colors"
      >
        En savoir plus sur {artistName}
      </button>
    </div>
  );
}
```

Test `ArtistBio.test.tsx`: mock `useArtistInfo` (`vi.mock('../../hooks/useArtistInfo')`): loading → skeletons and no text; no bio → renders nothing; bio → clamped paragraph + button calling `onOpenPanel`.

- [ ] **Step 10: ArtistContext handles loading/absence + drops the fake-link accent** — replace the guard `if (!artistName || !data?.bio) return null;` with `if (!artistName) return null;`, destructure `isLoading` from `useArtistInfo`, and inside `ModalShell` render skeleton lines when `isLoading`, the bio when present, else `<p className="text-body text-ink-soft">Pas d'informations pour cet artiste.</p>`. Change similar-artist chips `text-accent` → `text-ink-soft` (they are not links).

- [ ] **Step 11: Recompose Player/index.tsx** — target structure (constants replaced):

```tsx
const SCENE = 'flex flex-col gap-6 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_17rem]';
const DIRECT = 'min-w-0 flex flex-col gap-5 lg:min-h-0 lg:overflow-y-auto lg:pr-6 lg:pt-2';
const NOW = 'flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,42%)_1fr] lg:items-end lg:gap-10';
const META = 'min-w-0 flex flex-col gap-3 lg:gap-4';
```

and the loaded branch becomes:

```tsx
<div className={DIRECT}>
  <div className="rule pt-2">
    <AntennaStatus />
  </div>
  <div className={NOW}>
    <div className="relative artwork-size mx-auto lg:mx-0">
      <TrackArtwork />
      <div className="absolute -bottom-3 -right-3">
        <PlaybackControls />
      </div>
    </div>
    <div className={META}>
      <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
      <Antenna />
      <SecondaryControls />
    </div>
  </div>
  <ArtistBio onOpenPanel={() => setArtistPanelOpen(true)} />
</div>
```

Key points: `lg:my-auto` is gone (anchored top), the live line sits first above a `rule`, play overlaps the artwork corner (`-bottom-3 -right-3`), `SecondaryControls` stays as quiet satellites in the meta column, mobile keeps one stacked flow (the absolute play works on both). `TrackArtwork`'s outer wrapper `relative artwork-size mx-auto lg:mx-0` moves to this new parent — inside `TrackArtwork` the root becomes `<div key={artUrl} className="w-full">`. Update the skeleton branch to mirror the same silhouette (live-line bar, artwork block with a round `size-14` skeleton at its corner, three text lines).

- [ ] **Step 12: Validate + screenshots** — `pnpm typecheck && pnpm lint && pnpm test` all green. Run the screenshot loop; acceptance: no dead zone above the manchette at 1440x900, play visually attached to the artwork, live line visible, no listener count, bio paragraph present (or absent without hole), idle state shows the invitation text instead of flat dots.

- [ ] **Step 13: Commit + PR**

```bash
git checkout -b feat/live-page-manchette
git add <each modified/created file>
git commit -m "feat(frontend): recompose live page as anchored manchette"
gh pr create --fill && gh pr merge --auto --merge
```

---

### Task 2: Journal as margin column

**Files:**

- Modify: `src/components/Player/StationLog.tsx`
- Modify: `src/components/Player/StationLogRow.tsx`
- Test: `src/components/Player/StationLog.test.tsx`

**Interfaces:** consumes `useRecentHistory()` (`{ entries, isLoading, error }`); no produced API changes.

- [ ] **Step 1: Failing test** — mock `useRecentHistory` returning 10 entries; assert only 6 rows render (`screen.getAllByRole('listitem')` has length 6).
- [ ] **Step 2: Implement** — in `StationLog.tsx` render `entries.slice(0, 6)`; soften ink: row title `text-ink` → `text-ink-soft` and thumb `size-11` → `size-9` in `StationLogRow.tsx` (mirror the same sizes in the skeleton rows). Note: 32px thumb target from the spec is display-only (not interactive), `size-9`=36px keeps legibility with the 44px action buttons coming in Task 6; if it still fights the manchette on screenshots, drop to `size-8`.
- [ ] **Step 3: Tests + validation** — `pnpm test -- StationLog` PASS, full validation trio, screenshot loop: the journal reads clearly quieter than the direct at 1440x900.
- [ ] **Step 4: Commit + PR** — `feat(frontend): quiet the station log into a margin column`.

---

### Task 3: Dusk differentiation + AA verification

**Files:**

- Modify: `src/index.css:37-44`
- Create: `scripts/check-contrast.mjs`

- [ ] **Step 1: New dusk tokens** — starting values (iterate on screenshots):

```css
[data-moment='dusk'] {
  /* Crépuscule — papier mauve rosé réchauffé, encre prune, accent ambre */
  --paper: hsl(292 24% 90%);
  --ink: hsl(288 24% 11%);
  --accent: hsl(30 85% 33%);
  --on-accent: hsl(292 24% 95%);
  --sky: hsl(318 34% 84%);
}
```

- [ ] **Step 2: Contrast script** — `scripts/check-contrast.mjs`, run with `node scripts/check-contrast.mjs`; it recomputes the derived tokens exactly like the CSS does and fails (exit 1) under 4.5:1:

```js
const moments = {
  night: { paper: [240, 18, 10], ink: [40, 30, 92], accent: [230, 45, 74], sky: [238, 22, 13] },
  dawn: { paper: [10, 45, 93], ink: [350, 25, 12], accent: [345, 55, 45], sky: [8, 55, 89] },
  day: { paper: [210, 36, 97], ink: [220, 26, 12], accent: [214, 74, 38], sky: [210, 45, 94] },
  dusk: { paper: [292, 24, 90], ink: [288, 24, 11], accent: [30, 85, 33], sky: [318, 34, 84] },
};
const hslToRgb = ([h, s, l]) => {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
};
const mix = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));
const lum = (rgb) =>
  rgb
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (f, b) => {
  const [l1, l2] = [lum(f), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
let fail = false;
for (const [name, m] of Object.entries(moments)) {
  const paper = hslToRgb(m.paper),
    ink = hslToRgb(m.ink),
    sky = hslToRgb(m.sky);
  const pairs = {
    'ink/paper': [ink, paper],
    'ink-soft/paper': [mix(ink, paper, 0.75), paper],
    'ink-faint/paper': [mix(ink, paper, 0.66), paper],
    'ink-faint/sky': [mix(ink, paper, 0.66), sky],
    'accent/paper': [hslToRgb(m.accent), paper],
  };
  for (const [pair, [f, b]] of Object.entries(pairs)) {
    const r = ratio(f, b);
    const ok = r >= 4.5;
    if (!ok) fail = true;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${pair} ${r.toFixed(2)}`);
  }
}
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Iterate** — run the script; adjust the dusk (or any failing) HSL values until every pair passes, keeping the CSS and script values identical. Then screenshot loop: the four moments must be tellable apart at a glance (spec: < 2 s), dusk clearly warmer than day.
- [ ] **Step 4: Validation + commit + PR** — trio green; `feat(frontend): warm the dusk moment and enforce AA across moments` (mention the script in the PR body).

---

### Task 4: AuthModal form standards

**Files:**

- Modify: `src/components/AuthModal.tsx`
- Test: `src/components/AuthModal.test.tsx` (extend)

- [ ] **Step 1: Failing tests** — extend the existing test file:

```tsx
it('associates a visible label with the email field', () => {
  renderAuthModal(); // reuse the file's existing setup helper
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
});

it('flags mismatched passwords on the confirmation field, not via toast', async () => {
  // switch to reset/signup mode per the file's existing helpers, fill both
  // password fields with different values, blur the confirmation field
  expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
  expect(screen.getByLabelText('Confirmer le mot de passe')).toHaveAttribute(
    'aria-invalid',
    'true'
  );
});
```

- [ ] **Step 2: Introduce a local `Field` wrapper** in `AuthModal.tsx` and use it for the name/email/password/confirmation inputs (AuthModal.tsx:216, 230, 244, 271):

```tsx
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-caption text-ink-soft">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-caption text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

Each input gets `id`, `aria-invalid={Boolean(error)}`, `aria-describedby={error ? `${id}-error` : undefined}`; placeholders become examples (`placeholder="vous@exemple.fr"`) instead of labels.

- [ ] **Step 3: Blur validation** — add an `errors` state (`Record<string, string>`), validate on each field's `onBlur` (email format, password length >= 6, confirmation match — message « Les mots de passe ne correspondent pas. »), never clear the field's value, clear a field's error as soon as it revalidates. On submit, run all validators and focus the first invalid field instead of toasting; keep toasts only for backend errors.
- [ ] **Step 4: Keyboard + navigation fixes** — remove `tabIndex={-1}` on the show/hide toggle (AuthModal.tsx:258) and raise its hit area to `size-11` with the icon centered; render the back `IconButton` (AuthModal.tsx:169-176) in `reset-password` mode too.
- [ ] **Step 5: Tests + validation + commit + PR** — trio green; `fix(frontend): bring auth forms to label/blur-validation standard`.

---

### Task 5: LikedTracksModal — safe deletion, reachable focus, bounded list

**Files:**

- Modify: `src/components/LikedTracksModal.tsx`
- Test: `src/components/LikedTracksModal.test.tsx` (create)

- [ ] **Step 1: Failing tests** — with the store seeded with 60 tracks: only 50 rows render plus a button « Afficher les 10 autres » ; clicking it renders all. With `pointer-coarse` unmockable in jsdom, assert the delete button has the `pointer-coarse:opacity-100` class instead.
- [ ] **Step 2: Delete affordance + undo** — on the delete button (LikedTracksModal.tsx:107) replace `opacity-0 group-hover:opacity-100` with `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100`; after a successful delete show `toast('Morceau retiré', { action: { label: 'Annuler', onClick: () => void likeTrack(track) } })` where `likeTrack` re-adds via the store's existing like action (check its exact name in `src/stores/likedTracksStore.ts` and use it).
- [ ] **Step 3: Sticky header vs focus** — add `scroll-pt-16` (matches the sticky header height — measure it) to the scrolling list container, so a keyboard-focused row is never hidden under the sticky header (WCAG 2.4.11).
- [ ] **Step 4: Bounded list** — `const [visibleCount, setVisibleCount] = useState(50);` render `sortedTracks.slice(0, visibleCount)`; below the list, when `sortedTracks.length > visibleCount`, a `Button variant="ghost"` « Afficher les N autres » that sets `visibleCount(sortedTracks.length)`. Replace `max-h-[280px]` (line 141) with `max-h-72`.
- [ ] **Step 5: Tests + validation + commit + PR** — `fix(frontend): safer deletion and bounded list in library modal`.

---

### Task 6: Transverse fixes (targets, volume, mute, AirPlay, About, PWA, errors, toasts, meta)

**Files:**

- Modify: `src/components/ui/Button.tsx`, `src/components/Player/VolumeControl.tsx`, `src/components/Player/SecondaryControls.tsx`, `src/lib/player.ts` (store), `src/components/Player/AirPlayButton.tsx`, `src/components/AboutModal.tsx`, `src/components/PWAInstallBanner.tsx`, `src/components/ErrorFallback.tsx`, `src/layout/Layout.tsx`, `index.html`, delete `src/assets/react.svg`
- Test: `src/lib/player.test.ts` (extend), `src/components/ErrorFallback.test.tsx` (extend)

- [ ] **Step 1: 44px IconButton** — in `Button.tsx:47-59` change the IconButton sizing from `p-2` (~36px) to a fixed `size-11` with centered icon. Screenshot loop afterwards to confirm nothing overflows (header, meta actions row, journal rows).
- [ ] **Step 2: Mute lives in the player store** — failing test first in `src/lib/player.test.ts`:

```ts
it('toggleMute restores the pre-mute volume', () => {
  usePlayer.getState().setVolume(0.4);
  usePlayer.getState().toggleMute();
  expect(usePlayer.getState().volume).toBe(0);
  usePlayer.getState().toggleMute();
  expect(usePlayer.getState().volume).toBe(0.4);
});
```

Implement `isMuted` + `prevVolume` + `toggleMute` in the store (muting stores current volume then sets 0; unmuting restores `prevVolume`, defaulting to 0.5 if it was 0); `SecondaryControls.tsx` drops its local `isMuted`/`prevVolume` state (lines 13-14) and reads the store.

- [ ] **Step 3: Volume reachable by keyboard and by name** — in `VolumeControl.tsx`: expand also on `onFocus` within the group (not only hover/tap), keep `opacity-0 pointer-events-none` only while collapsed AND not focus-within (`group-focus-within` variant or `isExpanded || isFocusWithin`); change the icon button labels to `'Volume — couper le son'` / `'Volume — rétablir le son'`.
- [ ] **Step 4: AirPlay non-chromatic active state** — in `AirPlayButton.tsx:22`, when active add a visible dot under the icon: wrap the icon in a flex-col span with `<span className="size-1 rounded-full bg-accent" />` shown only when active (color changes stay, the dot carries the state for color-blind users).
- [ ] **Step 5: AboutModal links** — remove the three dead `href="#"` social links (AboutModal.tsx:12-14) and their icons; keep the mailto. (If real Instagram/Spotify/Discord URLs exist, put them instead with `target="_blank" rel="noopener noreferrer"` and brand-faithful icons — ask the user; default is removal.)
- [ ] **Step 6: PWA banner** — wrap `localStorage.getItem` in the initializer (PWAInstallBanner.tsx:13-15) with `typeof window === 'undefined' ? false : ...`; replace the plain install `<button>` (lines 57-62) with `<Button variant="accent" onClick={...}>Installer</Button>`; on the fixed container add `pb-[env(safe-area-inset-bottom)]`.
- [ ] **Step 7: ModalErrorFallback on ModalShell** — rebuild it with `ModalShell` (`isOpen` always true, `onClose` = the fallback's close), title « Une erreur est survenue », body naming the action: « La fenêtre a rencontré un problème. Fermez-la puis rouvrez-la ; si l'erreur persiste, rechargez la page. » Radix restores focus trap + Escape. Update `ErrorFallback.test.tsx` accordingly.
- [ ] **Step 8: Toast durations by severity** — in `Layout.tsx` Toaster: keep `duration={3000}` as default but pass `toastOptions` per type via sonner's `toastOptions={{ classNames: ... }}` for the borders (moving the `!border-l-[var(...)]` arbitraries into two utilities `.toast-success` / `.toast-danger` in `index.css` `@layer utilities` using `border-left: 2px solid var(--color-success|danger)`), and create `src/lib/appToast.ts` exporting `toastError = (msg: string) => toast.error(msg, { duration: 8000 })`; replace `toast.error` call sites (grep) with it.
- [ ] **Step 9: Meta + cleanup** — in `index.html`: add `<meta name="color-scheme" content="dark light" />` and align the hardcoded `theme-color` with night paper `#15151e` → verify it equals `hsl(240 18% 10%)` (`#15151e` is correct; keep, just confirm); delete `src/assets/react.svg`.
- [ ] **Step 10: Full validation** — trio green, screenshot loop (all 4 moments × 2 viewports), plus manual keyboard pass: tab through header → manchette → volume (expands on focus) → journal.
- [ ] **Step 11: Commit + PR** — `fix(frontend): transverse a11y and component polish` (one PR; commits per step group are fine).

---

## Final acceptance (after Task 6 merges)

- Run the screenshot loop one last time on master; compare against the audit's baseline shots; the spec's diagnostic list (8 items) and secondary-components list must each map to a shipped change.
- `DevSystemPage` still renders every primitive correctly in the 4 moments (visit `/?moment=...` on the dev-system route).
