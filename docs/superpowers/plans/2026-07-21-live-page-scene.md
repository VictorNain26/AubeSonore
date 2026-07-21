# Live Page « La Scène » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the live page as a single-viewport scene (centered player, bottom recent-tracks rail, no live label, no play prompt) per `docs/superpowers/specs/2026-07-21-live-page-scene-design.md`.

**Architecture:** New `RecentTracks` horizontal rail replaces the vertical `StationLog`; `Player/index.tsx` becomes the scene (artwork+play | text block) centered in the row between header and rail; `AntennaStatus` and the play prompt are deleted; `Antenna` keeps only the off-air message. Layout shell already provides `h-dvh grid-rows-[auto_1fr] overflow-hidden` — the scene manages its own `grid-rows-[1fr_auto]`.

**Tech Stack:** React 19, Tailwind 4 tokens v3, design/ui primitives, Vitest 3, motion/react (existing presets only).

## Global Constraints

- Tokens v3 only: `bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-text-faint`, `border-border`, `bg-accent`, `text-accent`, `text-on-accent`, `dawn-glow`. Typo: `text-display|title|lead|body|caption`. Radii: `rounded-sm|md|full`. No hex/hsl/oklch outside `tokens.css`, no arbitrary color/spacing-scale/typography values (`dvh`/`min()` sizing values are layout, allowed — precedent: `artwork-size`, `70dvh`).
- No comments unless a non-obvious WHY. No eslint-disable. No `as const` casts on variants.
- Forbidden copy anywhere: « En direct », « Appuyez sur lecture ». The only allowed status text is « Hors antenne… » (off-air).
- Interactive targets ≥ 44px (play ≥ 56px). All hover/focus-visible/active/disabled states.
- Verification per task: `pnpm typecheck && pnpm lint && pnpm test --run --coverage` (never `--` before `--run`). Stage file by file.

---

### Task 1: RecentTracks rail (replaces StationLog)

**Files:**

- Create: `apps/frontend/src/components/Player/RecentTracks.tsx`
- Create: `apps/frontend/src/components/Player/RecentTrackCard.tsx`
- Create: `apps/frontend/src/components/Player/RecentTracks.test.tsx`
- Modify: `apps/frontend/vitest.config.ts` (exclude list: remove `'src/components/Player/StationLog.tsx'` / `'src/components/Player/StationLogRow.tsx'` if present; add `'src/components/Player/RecentTrackCard.tsx'` is NOT allowed — the card must be tested)

**Interfaces:**

- Consumes: `useNowPlayingStore` from `../../lib/azuracast` — `s.data?.song_history` (array of `{ sh_id, played_at, song: { title, artist, art } }`), `s.data?.now_playing?.sh_id`, `s.error`, `s.isLoading`. Reuse like/share wiring exactly as `StationLogRow.tsx` does today (read it first: `useLikedTracksStore`, `shareTrack`) — copy that logic, do not reinvent.
- Produces: `export function RecentTracks()` — self-contained section, no props. Task 2 renders it at the scene's bottom row.

- [ ] **Step 1: Read `StationLog.tsx` + `StationLogRow.tsx`** to lift the exact data selectors, like/share handlers, `timeFormatter`, and test patterns from `StationLog.test.tsx`.

- [ ] **Step 2: Write failing tests** in `RecentTracks.test.tsx` (jsdom, mirror `StationLog.test.tsx` store setup):

```tsx
it('excludes the now-playing track from the rail', () => {
  useNowPlayingStore.setState({
    data: {
      now_playing: { sh_id: 10, played_at: 0, song: { title: 'Now', artist: 'A', art: '' } },
      song_history: [
        { sh_id: 10, played_at: 0, song: { title: 'Now', artist: 'A', art: '' } },
        { sh_id: 9, played_at: 1, song: { title: 'Before', artist: 'B', art: '' } },
      ],
    } as never,
  });
  render(<RecentTracks />);
  expect(screen.queryByText('Now')).not.toBeInTheDocument();
  expect(screen.getByText('Before')).toBeInTheDocument();
});

it('renders at most six items in a labelled list', () => {
  /* 8 history entries → 6 listitems, list has accessible name « Vient de passer » */
});
it('shows the partial-history notice on error', () => {
  /* s.error set → notice text visible */
});
it('renders skeleton cards while loading with empty history', () => {
  /* isLoading, no data → pulse blocks, no listitems */
});
```

- [ ] **Step 3: Run tests, verify FAIL** (`pnpm test --run src/components/Player/RecentTracks` inside `pnpm vitest` naming — expected: module not found).

- [ ] **Step 4: Implement `RecentTrackCard.tsx`** — one rail item:

```tsx
interface RecentTrackCardProps {
  entry: SongHistoryEntry;
}
```

Structure: `<li>` → flex row `items-center gap-3 py-2 pr-4 shrink-0 snap-start` → mini artwork `size-10 rounded-sm bg-surface-raised overflow-hidden` (img with `onError` fallback to `Music` icon `text-text-faint`, same as StationLogRow) → text block `min-w-0` (title `text-body text-text-muted truncate max-w-40`, artist `text-caption text-text-faint truncate max-w-40`) → time `<time>` `text-caption text-text-faint tabular-nums` → like/share buttons lifted from StationLogRow (44px targets `size-11`, `text-text-faint hover:text-text`, liked = `text-accent`; visible always under `(hover:none)` via `opacity-100`, on hover-capable: `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100` with the `group` class on the `<li>`).

- [ ] **Step 5: Implement `RecentTracks.tsx`**:

```tsx
export function RecentTracks() {
  const history = useNowPlayingStore((s) => s.data?.song_history);
  const nowPlayingId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const error = useNowPlayingStore((s) => s.error);
  const isLoading = useNowPlayingStore((s) => s.isLoading);
  const entries = (history ?? []).filter((e) => e.sh_id !== nowPlayingId).slice(0, 6);
  return (
    <section aria-label="Vient de passer" className="border-t border-border">
      <div className="mx-auto w-full max-w-page px-6 py-3">
        <h2 className="text-caption tracking-widest uppercase text-text-faint mb-1.5">
          Vient de passer
        </h2>
        {error && entries.length > 0 ? (
          <p className="text-caption text-text-faint">Historique partiel.</p>
        ) : null}
        {isLoading && entries.length === 0 ? (
          /* 4 skeleton cards: flex row of `h-10 w-56 animate-pulse rounded-sm bg-surface-raised` */
        ) : (
          <ul role="list" className="flex overflow-x-auto snap-x snap-proximity gap-4 pb-1">
            {entries.map((entry) => (
              <RecentTrackCard key={entry.sh_id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
```

(`role="list"` on `ul` is required — Safari drops list semantics with `list-style:none`. `pb-1` keeps the scrollbar off the text. Exact error/empty copy: reuse the existing « Historique partiel — actualisation impossible pour le moment. » sentence from StationLog if tests reference it; keep « Aucun morceau pour l'instant. » for the empty non-loading state.)

- [ ] **Step 6: Run tests → PASS**, then full gates: `pnpm typecheck && pnpm lint && pnpm test --run --coverage`.

- [ ] **Step 7: Commit** — `feat(frontend): recent tracks rail component` (stage the 3 new files + vitest.config.ts if touched).

---

### Task 2: Scene recomposition (Player/index.tsx + Antenna + artwork sizing)

**Files:**

- Modify: `apps/frontend/src/components/Player/index.tsx`
- Modify: `apps/frontend/src/components/Player/Antenna.tsx` (delete the play-prompt `<p>`; keep the off-air branch untouched)
- Modify: `apps/frontend/src/components/Player/Antenna.test.tsx` (drop the prompt assertion; assert the prompt is absent)
- Modify: `apps/frontend/src/design/tokens.css` (`artwork-size` gains a height bound)
- Test: `apps/frontend/src/components/Player/index.test.tsx` (adapt existing layout tests)

**Interfaces:**

- Consumes: `RecentTracks` from Task 1. Existing children unchanged: `TrackArtwork` (already hosts the superposed play via `PlaybackControls`, size-14/16 accent — compliant), `TrackMeta` (title/artist/like/share), `WaveformCanvas`, `VolumeControl`, `AirPlayButton`, `ArtistBio`, `Antenna`.
- Produces: the scene — root `<div className="grid h-full grid-rows-[1fr_auto] overflow-hidden">`; row 1 centers the player block; row 2 is `<RecentTracks />`.

- [ ] **Step 1: Antenna.tsx** — remove `<p className="text-caption text-text-muted">Appuyez sur lecture pour écouter le direct.</p>` and any wrapper that exists only for it. Off-air branch stays byte-identical.

- [ ] **Step 2: Antenna.test.tsx** — replace the prompt assertion with `expect(screen.queryByText(/Appuyez sur lecture/)).not.toBeInTheDocument();` and keep the play `aria-label` assertion (add one if missing: the play button carries « Écouter le direct »).

- [ ] **Step 3: `tokens.css` artwork-size** — bound by height so 390×844 and ~667px-tall viewports never scroll:

```css
@utility artwork-size {
  width: min(100%, 20rem, 38dvh);
  @media (width >= 64rem) {
    width: min(24rem, 42dvh);
  }
}
```

- [ ] **Step 4: index.tsx scene structure** — drop `AntennaStatus` and `StationLog` imports/usages; delete the `DIRECT` eyebrow and its border row (the scene needs no section label — the page IS the section); recompose:

```tsx
return (
  <div className="grid h-full grid-rows-[1fr_auto] overflow-hidden">
    <div className="flex min-h-0 items-center justify-center px-6">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-10">
        <div className="relative artwork-size shrink-0">
          <TrackArtwork /* unchanged, play superposed */ />
        </div>
        <div className="flex w-full min-w-0 flex-col items-center gap-3 text-center lg:items-start lg:text-left">
          <TrackMeta />
          <div className="flex items-center gap-1">
            {/* VolumeControl, AirPlayButton satellites */}
          </div>
          <div className="h-10 w-full max-w-md">
            <WaveformCanvas />
          </div>
          <Antenna />
          <div className="hidden lg:block">
            <ArtistBio />
          </div>
        </div>
      </div>
    </div>
    <RecentTracks />
  </div>
);
```

Adapt to the real current markup (read index.tsx first — keep skeleton branch symmetrical with the new layout: same grid, artwork pulse block `artwork-size aspect-square rounded-md animate-pulse bg-surface-raised`, three text pulse lines). Bio clamp: ArtistBio already clamps; wrapping div hides it below `lg`.

- [ ] **Step 5: index.test.tsx** — update assertions that referenced `DIRECT`, `StationLog`, or `AntennaStatus`; add: `expect(screen.queryByText(/En direct/)).not.toBeInTheDocument()` and rail presence via `screen.getByRole('list', { name: 'Vient de passer' })` (mock store as existing tests do).

- [ ] **Step 6: Gates** — `pnpm typecheck && pnpm lint && pnpm test --run --coverage`. Guard: `grep -rnE "En direct|Appuyez sur lecture|AntennaStatus|StationLog" src/components/Player/index.tsx src/components/Player/Antenna.tsx` → zero.

- [ ] **Step 7: Commit** — `feat(frontend): single-screen scene layout for the live page`.

---

### Task 3: Delete dead components

**Files:**

- Delete: `apps/frontend/src/components/Player/AntennaStatus.tsx`, `AntennaStatus.test.tsx`, `StationLog.tsx`, `StationLog.test.tsx`, `StationLogRow.tsx`
- Modify: `apps/frontend/vitest.config.ts` (drop their exclude entries)

**Interfaces:**

- Consumes: Tasks 1–2 merged into the branch (nothing imports these anymore).
- Produces: zero references repo-wide.

- [ ] **Step 1:** `grep -rn "AntennaStatus\|StationLog" src vitest.config.ts` → only the files themselves + config. Then `git rm` the five files; edit vitest.config.ts.
- [ ] **Step 2: Gates** — full chain incl. `pnpm build && node scripts/check-contrast.mjs`. Repo-wide guard: `grep -rnE "AntennaStatus|StationLog|En direct|Appuyez sur lecture" src/` → zero.
- [ ] **Step 3: Commit** — `refactor(frontend): drop antenna status and vertical station log`.

---

### Task 4: Visual verification + PR

- [ ] **Step 1:** Dev server (already on :5173) → 4 CDP captures (light/dark × 1280×800 / 390×844) via the session's shot.mjs. Check against spec: zero vertical scroll both viewports, rail visible with ≤6 past tracks, no live label, no prompt, flat waveform at rest, play on artwork.
- [ ] **Step 2:** Adversarial review of the whole branch diff; fix findings in-cycle.
- [ ] **Step 3:** Push, PR `feat(frontend): live page becomes a single-screen scene`, body citing spec + decisions, auto-merge on the 4 required checks.
