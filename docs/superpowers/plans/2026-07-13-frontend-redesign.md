# Frontend Redesign (Day-Cycle Identity) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the AubeSonore frontend identity around the day-cycle editorial line (spec: `docs/superpowers/specs/2026-07-13-frontend-redesign-design.md`): generative sky background, moment-driven design tokens, day-timeline history, GSAP narrative choreography — and strip every feature the spec cuts.

**Architecture:** Single-page player app (unchanged). A `useMoment()` hook stamps `data-moment` on `<html>`; CSS custom properties per moment drive all colors through Tailwind 4 `@theme`. The background is two layers: a generative sky (CSS at rest, GSAP timelines at transitions) and a downscaled cover tint. History becomes a day-timeline grouped by moment, with a ScrollTrigger-driven sky replay on scroll.

**Tech Stack:** React 19, Vite 8, Tailwind 4 (`@theme` in `src/index.css`), Zustand 5, `motion` (framer-motion successor) for component micro-transitions, GSAP + `@gsap/react` for narrative choreography, Vitest + RTL + MSW.

## Global Constraints

- Work on branch `feat/frontend-redesign` cut from `origin/master` (PR #87's frontend WIP is superseded by this redesign; resolve any future conflict in favor of this branch).
- Package manager: `pnpm` (root workspace). Frontend filter: `@aubesonore/frontend`. Never create per-package lockfiles.
- Conventional Commits in English; commit trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`; stage files explicitly (`git add <file>`), never `git add .`.
- After each task: `pnpm --filter @aubesonore/frontend typecheck` must pass. Tests: `pnpm --filter @aubesonore/frontend test -- --run`.
- Animations: `transform`/`opacity` only; every GSAP choreography must check `prefers-reduced-motion` and degrade to a simple fade or nothing.
- Moment boundaries (single source of truth, mirrors AzuraCast playlists): dawn 05:00–09:00, day 09:00–17:00, dusk 17:00–22:00, night 22:00–05:00. Local visitor time.
- No new dependencies beyond: `motion`, `gsap`, `@gsap/react`, `@fontsource-variable/fraunces`. Removed: `framer-motion` (replaced by `motion`), `satori`, `@resvg/resvg-wasm`.
- French UI copy: moment labels are «Aube», «Jour», «Crépuscule», «Nuit». Share copy: `«[titre] — découvert à l'aube sur AubeSonore»` where «à l'aube» adapts to the moment (`à l'aube / en journée / au crépuscule / dans la nuit`).
- TypeScript strict; no `eslint-disable`; no code comments unless stating a non-obvious constraint.

---

## Phase 1 — Suppressions (push, stats, share cards) + migration `motion`

### Task 1: Branch setup + remove push notifications

**Files:**
- Delete: `apps/frontend/src/hooks/usePushNotifications.ts`, `apps/frontend/src/hooks/usePushNotifications.test.ts`, `apps/frontend/src/components/NotificationBanner.tsx`, `apps/frontend/src/components/NotificationBanner.test.tsx`
- Modify: `apps/frontend/src/App.tsx` (drop `<NotificationBanner/>` + its import)
- Modify: `apps/frontend/src/sw.ts` (drop `push` and `notificationclick` listeners, ~lines 57–99)
- Modify: `apps/frontend/src/mocks/handlers.ts` (drop the three `/api/push/*` handlers)

**Interfaces:**
- Consumes: nothing.
- Produces: `bannerSlotStore` keeps only the `'pwa'` consumer (do NOT delete `src/stores/bannerSlotStore.ts` — `PWAInstallBanner` uses it).

- [ ] **Step 1: Create the branch**

```bash
cd ~/AubeSonore && git fetch origin && git checkout -b feat/frontend-redesign origin/master
```

- [ ] **Step 2: Delete the push files**

```bash
git rm apps/frontend/src/hooks/usePushNotifications.ts apps/frontend/src/hooks/usePushNotifications.test.ts apps/frontend/src/components/NotificationBanner.tsx apps/frontend/src/components/NotificationBanner.test.tsx
```

- [ ] **Step 3: Unwire**

In `App.tsx`, remove the `NotificationBanner` import and JSX. In `sw.ts`, remove the `self.addEventListener('push', …)` and `self.addEventListener('notificationclick', …)` blocks (keep precache + artwork CacheFirst route). In `mocks/handlers.ts`, remove the `/api/push/vapid-key`, `/api/push/subscribe`, `/api/push/unsubscribe` handlers.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend test -- --run`
Expected: PASS (push test files no longer exist; nothing else referenced the hook).
Run: `grep -ri "push" apps/frontend/src --include='*.ts*' -l` — expected: no functional matches (only incidental words).

- [ ] **Step 5: Commit**

```bash
git add -A apps/frontend/src && git commit -m "feat(frontend): remove push notifications (0 subscribers, off-story)"
```

### Task 2: Remove listening stats

**Files:**
- Delete: `apps/frontend/src/components/StatsModal.tsx`, `apps/frontend/src/stores/statsStore.ts`, `apps/frontend/src/hooks/player/useListeningTimeTracker.ts`
- Modify: `apps/frontend/src/layout/Layout.tsx` (drop Stats button, `isStatsOpen` state, lazy import, `BarChart3` icon import)
- Modify: `apps/frontend/src/components/AuthInit.tsx` (drop `useStatsStore.getState().syncFromServer()` call + import)
- Modify: `apps/frontend/src/components/Player/PlayerSideEffects.tsx` (drop `useListeningTimeTracker(isPlaying)` call + import; KEEP `useTrackChangeEvents` wiring)
- Modify: `apps/frontend/src/hooks/player/useTrackChangeEvents.ts` (remove the `recordTrackChange` stats write; keep the sleep-timer end-of-track logic — read the file first: the hook drives both)
- Modify: `apps/frontend/src/lib/api.ts` (drop `statsApi` export), `apps/frontend/src/mocks/handlers.ts` (drop `/api/stats` handlers), `apps/frontend/vitest.config.ts` (drop `statsStore` coverage exclude)

**Interfaces:**
- Consumes: nothing.
- Produces: `useTrackChangeEvents(shId, artist, title)` keeps its exact signature (PlayerSideEffects continues to call it) but no longer records stats. `@aubesonore/core/stats` and `@aubesonore/shared-types/stats` are NOT deleted (mobile consumes them).

- [ ] **Step 1: Read `useTrackChangeEvents.ts` and separate concerns** — keep sleep-timer track-end handling, delete stats recording. Show the resulting hook in the diff (implementer: the remaining body should be only the sleep-timer effect).
- [ ] **Step 2: Delete files + unwire all listed modify-sites.**
- [ ] **Step 3: Verify**

Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend test -- --run && grep -rn "statsStore\|StatsModal\|statsApi\|useListeningTimeTracker" apps/frontend/src`
Expected: typecheck + tests PASS, grep returns nothing.

- [ ] **Step 4: Commit**

```bash
git add -A apps/frontend && git commit -m "feat(frontend): remove listening stats (day timeline tells the story)"
```

### Task 3: Replace satori share cards with Web Share API

**Files:**
- Delete: `apps/frontend/src/components/ShareCard/` (ShareButton.tsx, ShareCardRenderer.tsx), `apps/frontend/src/lib/shareUtils.ts`
- Create: `apps/frontend/src/lib/shareTrack.ts`
- Test: `apps/frontend/src/lib/shareTrack.test.ts`
- Modify: `apps/frontend/src/components/Player/TrackArtwork.tsx` (swap `ShareButton` for the new share trigger)
- Modify: `apps/frontend/src/sw.ts` (drop the `.wasm` CacheFirst route `aubesonore-wasm`), `apps/frontend/vite.config.ts` (drop `injectManifest.globIgnores: ['**/*.wasm']`), `apps/frontend/vitest.config.ts` (drop ShareCard/shareUtils coverage excludes)
- Modify: `apps/frontend/package.json` (remove `satori`, `@resvg/resvg-wasm`; KEEP `@fontsource/inter` — Task 9 starts importing it globally)

**Interfaces:**
- Consumes: `getTrackShareUrl`, `buildShareText` from `@aubesonore/core/share` (existing, satori-free).
- Produces: `shareTrack(input: { title: string; artist: string; url: string; momentLabel: string }): Promise<'shared' | 'copied'>` — uses `navigator.share` when available, else `navigator.clipboard.writeText`, text format `«${title} — ${artist}», découvert ${momentLabel} sur AubeSonore ${url}`. Task 5 provides `MOMENT_SHARE_PHRASES` and Task 12 wires it in; until then TrackArtwork passes the neutral phrase `'à l'instant'`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/frontend/src/lib/shareTrack.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { shareTrack } from './shareTrack';

const input = { title: 'Balance Act', artist: 'Psychic Lines', url: 'https://aubesonore.fr', momentLabel: "à l'aube" };

afterEach(() => vi.unstubAllGlobals());

describe('shareTrack', () => {
  it('uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    await expect(shareTrack(input)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'AubeSonore',
      text: "« Balance Act — Psychic Lines », découvert à l'aube sur AubeSonore",
      url: 'https://aubesonore.fr',
    });
  });

  it('falls back to clipboard when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(shareTrack(input)).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(
      "« Balance Act — Psychic Lines », découvert à l'aube sur AubeSonore https://aubesonore.fr",
    );
  });

  it('treats user-cancelled share as shared (no fallback)', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError'));
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } });
    await expect(shareTrack(input)).resolves.toBe('shared');
  });
});
```

- [ ] **Step 2: Run it** — `pnpm --filter @aubesonore/frontend test -- --run shareTrack` — expected FAIL (module not found).
- [ ] **Step 3: Implement**

```ts
// apps/frontend/src/lib/shareTrack.ts
interface ShareTrackInput {
  title: string;
  artist: string;
  url: string;
  momentLabel: string;
}

export async function shareTrack({ title, artist, url, momentLabel }: ShareTrackInput): Promise<'shared' | 'copied'> {
  const text = `« ${title} — ${artist} », découvert ${momentLabel} sur AubeSonore`;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'AubeSonore', text, url });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) throw err;
    }
    return 'shared';
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  return 'copied';
}
```

- [ ] **Step 4: Run tests** — expected PASS.
- [ ] **Step 5: Swap the trigger in `TrackArtwork.tsx`** — replace the `<ShareButton …/>` overlay with a button (same placement/styling, `Share2` icon from lucide) calling `shareTrack({ title, artist, url: trackUrl, momentLabel: "à l'instant" })`; on `'copied'` show a sonner toast `Lien copié`. Delete ShareCard files, shareUtils, sw wasm route, vite globIgnores; `pnpm remove --filter @aubesonore/frontend satori @resvg/resvg-wasm`.
- [ ] **Step 6: Verify** — typecheck + full tests PASS; `pnpm --filter @aubesonore/frontend build` succeeds; `grep -rn "satori\|resvg\|shareUtils\|ShareCard" apps/frontend/src` returns nothing.
- [ ] **Step 7: Commit** — `git add -A apps/frontend pnpm-lock.yaml && git commit -m "feat(frontend): replace satori share cards with Web Share API"`

### Task 4: Migrate framer-motion → motion

**Files:**
- Modify: every file importing `framer-motion` (13 after Tasks 1–2 removed NotificationBanner/StatsModal): `components/AboutModal.tsx`, `AuthModal.tsx`, `LikedTracksModal.tsx`, `PWAInstallBanner.tsx`, `Player/TrackArtwork.tsx`, `Player/TrackMeta.tsx`, `Player/PlaybackControls.tsx`, `Player/ListenersBadge.tsx`, `Player/ArtistContext.tsx`, `Player/FullHistoryModal.tsx`, `Player/HistoryList.tsx`, `Player/motion-presets.ts`
- Modify: `apps/frontend/package.json` (remove `framer-motion`, add `motion@^12`), `apps/frontend/vite.config.ts` (`manualChunks`: chunk test `framer-motion` → `motion`)

**Interfaces:**
- Produces: all animation imports come from `'motion/react'` (`import { motion, AnimatePresence } from 'motion/react'`; types like `Transition` from `'motion/react'`). `motion-presets.ts` exports (`trackFlip`, `toggle`, `dataTick`) unchanged.

- [ ] **Step 1:** `pnpm --filter @aubesonore/frontend remove framer-motion && pnpm --filter @aubesonore/frontend add motion`
- [ ] **Step 2:** Mechanical rewrite: `from 'framer-motion'` → `from 'motion/react'` in the 12 files; update `vite.config.ts` manualChunks matcher (`id.includes('node_modules/motion')` → chunk `motion`).
- [ ] **Step 3: Verify** — typecheck, full test run, `pnpm --filter @aubesonore/frontend build`; `grep -rn "framer-motion" apps/frontend` returns nothing.
- [ ] **Step 4: Commit** — `git commit -m "chore(frontend): migrate framer-motion to motion"` (explicit adds).

---

## Phase 2 — Système de moments

### Task 5: `lib/moments.ts` — pure moment logic

**Files:**
- Create: `apps/frontend/src/lib/moments.ts`
- Test: `apps/frontend/src/lib/moments.test.ts`

**Interfaces:**
- Produces (exact — later tasks depend on these names):

```ts
export type Moment = 'dawn' | 'day' | 'dusk' | 'night';
export const MOMENT_BOUNDS: Record<Moment, { start: number; end: number }>; // hours, night = {start:22,end:5}
export const MOMENT_LABELS: Record<Moment, string>;       // Aube, Jour, Crépuscule, Nuit
export const MOMENT_SHARE_PHRASES: Record<Moment, string>; // à l'aube, en journée, au crépuscule, dans la nuit
export const MOMENT_ORDER: Moment[];                        // ['dawn','day','dusk','night']
export function getMoment(date: Date): Moment;
export function nextBoundary(date: Date): Date;             // next moment switch, local time
```

- [ ] **Step 1: Write the failing tests**

```ts
// apps/frontend/src/lib/moments.test.ts
import { describe, it, expect } from 'vitest';
import { getMoment, nextBoundary, MOMENT_LABELS } from './moments';

const at = (h: number, m = 0) => new Date(2026, 6, 13, h, m);

describe('getMoment', () => {
  it.each([
    [5, 'dawn'], [8, 'dawn'], [9, 'day'], [16, 'day'],
    [17, 'dusk'], [21, 'dusk'], [22, 'night'], [0, 'night'], [4, 'night'],
  ] as const)('%ih → %s', (h, expected) => {
    expect(getMoment(at(h))).toBe(expected);
  });
});

describe('nextBoundary', () => {
  it('within a moment → its end', () => {
    expect(nextBoundary(at(10)).getHours()).toBe(17);
  });
  it('night before midnight → 5h next day', () => {
    const b = nextBoundary(at(23));
    expect(b.getHours()).toBe(5);
    expect(b.getDate()).toBe(14);
  });
  it('night after midnight → 5h same day', () => {
    const b = nextBoundary(at(2));
    expect(b.getHours()).toBe(5);
    expect(b.getDate()).toBe(13);
  });
});

it('labels are the French UI copy', () => {
  expect(MOMENT_LABELS).toEqual({ dawn: 'Aube', day: 'Jour', dusk: 'Crépuscule', night: 'Nuit' });
});
```

- [ ] **Step 2: Run** — expected FAIL (module not found).
- [ ] **Step 3: Implement**

```ts
// apps/frontend/src/lib/moments.ts
export type Moment = 'dawn' | 'day' | 'dusk' | 'night';

export const MOMENT_BOUNDS: Record<Moment, { start: number; end: number }> = {
  dawn: { start: 5, end: 9 },
  day: { start: 9, end: 17 },
  dusk: { start: 17, end: 22 },
  night: { start: 22, end: 5 },
};

export const MOMENT_LABELS: Record<Moment, string> = {
  dawn: 'Aube', day: 'Jour', dusk: 'Crépuscule', night: 'Nuit',
};

export const MOMENT_SHARE_PHRASES: Record<Moment, string> = {
  dawn: "à l'aube", day: 'en journée', dusk: 'au crépuscule', night: 'dans la nuit',
};

export const MOMENT_ORDER: Moment[] = ['dawn', 'day', 'dusk', 'night'];

export function getMoment(date: Date): Moment {
  const h = date.getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'dusk';
  return 'night';
}

export function nextBoundary(date: Date): Date {
  const starts = [5, 9, 17, 22];
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  const upcoming = starts.find((h) => h > date.getHours());
  if (upcoming !== undefined) {
    next.setHours(upcoming);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(5);
  }
  return next;
}
```

- [ ] **Step 4: Run** — expected PASS. **Step 5: Commit** — `feat(frontend): add moment domain logic (day-cycle bounds)`.

### Task 6: `useMoment()` hook + `data-moment` on `<html>`

**Files:**
- Create: `apps/frontend/src/hooks/useMoment.ts`
- Test: `apps/frontend/src/hooks/useMoment.test.ts`
- Modify: `apps/frontend/src/App.tsx` (mount a `<MomentRoot/>`-style null component or call the hook in App)

**Interfaces:**
- Consumes: `getMoment`, `nextBoundary` from `lib/moments`.
- Produces: `export function useMoment(): Moment` — returns current moment, re-renders at each boundary; side effect sets `document.documentElement.dataset.moment`. Single `setTimeout` to `nextBoundary`; recompute on `visibilitychange` (background tabs throttle timers).

- [ ] **Step 1: Failing test (fake timers)**

```ts
// apps/frontend/src/hooks/useMoment.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMoment } from './useMoment';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useMoment', () => {
  it('returns the current moment and stamps <html>', () => {
    vi.setSystemTime(new Date(2026, 6, 13, 10, 0));
    const { result } = renderHook(() => useMoment());
    expect(result.current).toBe('day');
    expect(document.documentElement.dataset.moment).toBe('day');
  });

  it('switches exactly at the boundary with a single timer', () => {
    vi.setSystemTime(new Date(2026, 6, 13, 16, 59));
    const { result } = renderHook(() => useMoment());
    expect(result.current).toBe('day');
    act(() => vi.advanceTimersByTime(61_000));
    expect(result.current).toBe('dusk');
    expect(document.documentElement.dataset.moment).toBe('dusk');
  });
});
```

Note: `vitest.config.ts` uses `environment:'node'` globally — this test needs jsdom. Add per-file pragma `// @vitest-environment jsdom` at the top (pattern check: other component tests already run somehow — read `AuthModal.test.tsx` first and copy whatever environment mechanism it uses).

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**

```ts
// apps/frontend/src/hooks/useMoment.ts
import { useEffect, useState } from 'react';
import { getMoment, nextBoundary, type Moment } from '../lib/moments';

export function useMoment(): Moment {
  const [moment, setMoment] = useState<Moment>(() => getMoment(new Date()));

  useEffect(() => {
    document.documentElement.dataset.moment = moment;
  }, [moment]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const now = new Date();
      setMoment(getMoment(now));
      timer = setTimeout(arm, nextBoundary(now).getTime() - now.getTime() + 500);
    };
    arm();
    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        arm();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return moment;
}
```

- [ ] **Step 4: Run** — PASS. **Step 5:** Call `useMoment()` from `App.tsx` (top of the component). **Step 6: Commit** — `feat(frontend): useMoment hook drives data-moment on html`.

### Task 7: Moment design tokens in `index.css`

**Files:**
- Modify: `apps/frontend/src/index.css`
- Delete: `apps/frontend/tailwind.config.js` (stale — references CSS vars that don't exist; Tailwind 4 runs off `@theme`)

**Interfaces:**
- Produces CSS custom properties consumed by Tasks 8/10/12/15: per-moment `--sky-1`, `--sky-2`, `--sky-3` (gradient stops), `--halo` (sun/moon color), `--color-accent` override. Default (`:root`) = night values; `[data-moment='…']` overrides for the other three.

- [ ] **Step 1:** Add to `index.css` (keep the existing `@theme` block; add `--color-accent` var indirection):

```css
:root {
  --sky-1: hsl(228 32% 5%);
  --sky-2: hsl(232 30% 9%);
  --sky-3: hsl(248 28% 13%);
  --halo: hsl(210 40% 72%);
  --accent-moment: hsl(232 34% 62%);
}
[data-moment='dawn'] {
  --sky-1: hsl(254 32% 12%);
  --sky-2: hsl(340 42% 26%);
  --sky-3: hsl(24 68% 46%);
  --halo: hsl(28 90% 66%);
  --accent-moment: hsl(20 80% 62%);
}
[data-moment='day'] {
  --sky-1: hsl(212 48% 16%);
  --sky-2: hsl(206 52% 30%);
  --sky-3: hsl(196 58% 44%);
  --halo: hsl(48 95% 76%);
  --accent-moment: hsl(200 70% 58%);
}
[data-moment='dusk'] {
  --sky-1: hsl(258 36% 10%);
  --sky-2: hsl(288 34% 20%);
  --sky-3: hsl(14 62% 38%);
  --halo: hsl(16 85% 60%);
  --accent-moment: hsl(300 45% 60%);
}
:root,
[data-moment] {
  transition: none;
}
```

In the `@theme` block, change `--color-accent: hsl(270 60% 60%);` to `--color-accent: var(--accent-moment);` so every existing `accent` utility follows the moment. Delete the `.aurora-bg` utility (Task 8 replaces it) only after Task 8 lands — for now leave it. Exact palette values are a starting point; the visual milestone review (§jalons) may retune them — they live in ONE place.

- [ ] **Step 2:** `git rm apps/frontend/tailwind.config.js`. Verify nothing imports it: `grep -rn "tailwind.config" apps/frontend` → nothing.
- [ ] **Step 3: Verify** — `pnpm --filter @aubesonore/frontend build` + open `pnpm --filter @aubesonore/frontend dev`, flip `document.documentElement.dataset.moment='dawn'` in devtools console: accent color of buttons/hearts shifts.
- [ ] **Step 4: Commit** — `feat(frontend): moment-driven design tokens`.

---

## Phase 3 — Ciel génératif, typographie, badge

### Task 8: `SkyBackground` — static generative sky (CSS only)

**Files:**
- Create: `apps/frontend/src/components/Sky/SkyBackground.tsx`, `apps/frontend/src/components/Sky/sky.css`
- Modify: `apps/frontend/src/layout/Layout.tsx` (replace `aurora-bg` class with `<SkyBackground/>` as first child), `apps/frontend/src/index.css` (remove `.aurora-bg`)

**Interfaces:**
- Consumes: tokens from Task 7.
- Produces: `export function SkyBackground(): JSX.Element` — `fixed inset-0 -z-10`, three stacked layers: (1) `.sky-gradient` using `linear-gradient(to top, var(--sky-3), var(--sky-2) 45%, var(--sky-1))`; (2) `.sky-halo` — radial gradient disc (`var(--halo)`) positioned by CSS vars `--halo-x`/`--halo-y` (percentages) that the component computes from the current hour (arc across the sky: 5h→22h maps x 8%→92%, y follows a sine; night pins the moon high-left) and refreshes every 5 min via one `setInterval`; (3) `.sky-grain` — a tiny inline SVG turbulence data-URI at ~4% opacity, `mix-blend-mode: overlay`. Exposes `id="sky-root"` for GSAP (Tasks 9/16).

- [ ] **Step 1:** Implement component + CSS (full code in-task):

```tsx
// apps/frontend/src/components/Sky/SkyBackground.tsx
import { useEffect } from 'react';
import './sky.css';

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

function haloPosition(date: Date): { x: number; y: number } {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 22 || h < 5) return { x: 22, y: 24 };
  const t = (h - 5) / 17;
  return { x: 8 + t * 84, y: 72 - Math.sin(t * Math.PI) * 52 };
}

export function SkyBackground() {
  useEffect(() => {
    const root = document.getElementById('sky-root');
    if (!root) return;
    const apply = () => {
      const { x, y } = haloPosition(new Date());
      root.style.setProperty('--halo-x', `${x}%`);
      root.style.setProperty('--halo-y', `${y}%`);
    };
    apply();
    const id = setInterval(apply, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div id="sky-root" className="sky" aria-hidden="true">
      <div className="sky-gradient" />
      <div className="sky-halo" />
      <div className="sky-grain" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
```

```css
/* apps/frontend/src/components/Sky/sky.css */
.sky {
  position: fixed;
  inset: 0;
  z-index: -10;
  overflow: hidden;
  --halo-x: 50%;
  --halo-y: 40%;
}
.sky-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, var(--sky-3), var(--sky-2) 45%, var(--sky-1));
  transition: background 1.2s ease;
}
.sky-halo {
  position: absolute;
  inset: -20%;
  background: radial-gradient(circle at var(--halo-x) var(--halo-y), var(--halo) 0%, transparent 26%);
  opacity: 0.5;
  filter: blur(24px);
}
.sky-grain {
  position: absolute;
  inset: 0;
  opacity: 0.04;
  mix-blend-mode: overlay;
}
```

- [ ] **Step 2:** Mount in `Layout.tsx` (first child of the root div), remove `aurora-bg` from the class list and delete the `.aurora-bg` utility from `index.css`.
- [ ] **Step 3: Verify** — dev server: sky renders, halo visibly placed by hour, flipping `data-moment` in console changes the palette (with the CSS transition). Build passes.
- [ ] **Step 4: Commit** — `feat(frontend): generative sky background (static layer)`.

### Task 9: GSAP choreography — light rises on load & at moment switches

**Files:**
- Create: `apps/frontend/src/components/Sky/useSkyChoreography.ts`
- Modify: `apps/frontend/src/components/Sky/SkyBackground.tsx` (call the hook), `apps/frontend/package.json` (add `gsap`, `@gsap/react`)

**Interfaces:**
- Consumes: `useMoment()` (Task 6), `#sky-root` DOM (Task 8).
- Produces: `export function useSkyChoreography(ref: React.RefObject<HTMLElement | null>): void` — (a) intro timeline once on mount: halo rises from below (`yPercent: 18 → 0`, `opacity: 0 → 0.5`, gradient layer fades in, ~2.4 s, `power2.out`); (b) on `moment` change: brief light swell (halo `opacity` to 0.75 and back over 2 s) layered on the CSS gradient transition. Both no-op to a plain 300 ms fade when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

- [ ] **Step 1:** `pnpm --filter @aubesonore/frontend add gsap @gsap/react`
- [ ] **Step 2:** Implement:

```ts
// apps/frontend/src/components/Sky/useSkyChoreography.ts
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useMoment } from '../../hooks/useMoment';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useSkyChoreography(ref: React.RefObject<HTMLElement | null>): void {
  const moment = useMoment();
  const hasIntroPlayed = useRef(false);

  useGSAP(
    () => {
      const halo = ref.current?.querySelector('.sky-halo');
      const gradient = ref.current?.querySelector('.sky-gradient');
      if (!halo || !gradient) return;

      if (!hasIntroPlayed.current) {
        hasIntroPlayed.current = true;
        if (reduced()) {
          gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
          return;
        }
        gsap
          .timeline({ defaults: { ease: 'power2.out' } })
          .fromTo(gradient, { opacity: 0 }, { opacity: 1, duration: 1.6 }, 0)
          .fromTo(halo, { yPercent: 18, opacity: 0 }, { yPercent: 0, opacity: 0.5, duration: 2.4 }, 0.3);
        return;
      }
      if (reduced()) return;
      gsap
        .timeline()
        .to(halo, { opacity: 0.75, duration: 1, ease: 'sine.inOut' })
        .to(halo, { opacity: 0.5, duration: 1, ease: 'sine.inOut' });
    },
    { dependencies: [moment], scope: ref },
  );
}
```

Rework `SkyBackground` to hold a `useRef<HTMLDivElement>(null)` on the root div and call `useSkyChoreography(ref)`. Note `useMoment` is now called both in App and here — it's cheap (one timeout each); alternatively lift the moment into a tiny Zustand store ONLY if a third consumer appears (YAGNI).

- [ ] **Step 3: Verify** — reload dev: light rises once; simulate a boundary (`vi`-style not available — temporarily set system clock or tweak `nextBoundary` locally, then revert) or flip `data-moment` + trigger by changing device clock; check reduced-motion via devtools rendering emulation: only a fade.
- [ ] **Step 4: Verify build + tests.** **Step 5: Commit** — `feat(frontend): gsap sky choreography (intro + moment swell)`.

### Task 10: Cover tint — rework `AmbientBackground`

**Files:**
- Modify: `apps/frontend/src/components/AmbientBackground.tsx` → rename file/export to `apps/frontend/src/components/Sky/CoverTint.tsx`
- Modify: `apps/frontend/src/pages/HomePage.tsx` (drop `<AmbientBackground/>`), `apps/frontend/src/layout/Layout.tsx` (mount `<CoverTint/>` right after `<SkyBackground/>`)

**Interfaces:**
- Consumes: `useNowPlayingStore`, `isDefaultArtwork` (existing), sky layer beneath.
- Produces: `export function CoverTint(): JSX.Element | null` — keeps the preload discipline of the current component verbatim; changes: downscale the artwork through an offscreen canvas to ≤ 64 px before display (`drawImage` to a 64×64 canvas, `toDataURL`), render as `fixed inset-0 object-cover scale-150 blur-[40px] opacity-25 mix-blend-soft-light pointer-events-none transition-opacity duration-1000`. No overlay div anymore (the sky provides depth). Returns null on default/missing cover — the sky alone carries the atmosphere.

- [ ] **Step 1:** Implement (keep the existing preload/anti-flash logic; add the canvas downscale inside the `onload` handler; beware CORS — artwork is same-origin via `radio.aubesonore.fr`, set `img.crossOrigin='anonymous'` and on canvas `SecurityError` fall back to the raw URL).
- [ ] **Step 2: Verify** — dev: cover tints the sky; track flip has no flash; a default-cover track shows pure sky. DevTools performance: no full-size image decode on the compositor path.
- [ ] **Step 3: Commit** — `feat(frontend): cover tint layer over generative sky`.

### Task 11: Typography — Inter global + Fraunces display + wordmark

**Files:**
- Modify: `apps/frontend/package.json` (add `@fontsource-variable/fraunces`), `apps/frontend/src/main.tsx` (font imports), `apps/frontend/src/index.css` (`@theme` font tokens + base body rule), `apps/frontend/src/layout/Layout.tsx` (wordmark + moment styling)

**Interfaces:**
- Produces: `--font-sans: 'Inter', system-ui, sans-serif` (the repo has static `@fontsource/inter` — import weights 400/500/600 via `@fontsource/inter/400.css` etc.) and `--font-display: 'Fraunces Variable', Georgia, serif`. Tailwind exposes `font-sans`/`font-display`.

- [ ] **Step 1:** `pnpm --filter @aubesonore/frontend add @fontsource-variable/fraunces`
- [ ] **Step 2:** In `main.tsx` add:

```ts
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource-variable/fraunces';
```

In `index.css` `@theme`: add `--font-sans: 'Inter', system-ui, sans-serif; --font-display: 'Fraunces Variable', Georgia, serif;` and a base rule `body { font-family: var(--font-sans); }`. Restyle the `<h1>` wordmark in Layout: `font-display`, slightly larger, letter-spacing tight; drop the gradient text in favor of `text-foreground` with a subtle `text-shadow` from `--halo` (identity comes from the sky now).

- [ ] **Step 3: Verify** — dev: body text is Inter, wordmark is Fraunces. Build size check: fonts are woff2 subsets, acceptable. **Milestone: screenshot for Victor (typo + sky).**
- [ ] **Step 4: Commit** — `feat(frontend): typography system (Inter text, Fraunces display)`.

### Task 12: Moment badge + SplitText title entrance

**Files:**
- Create: `apps/frontend/src/components/Player/MomentBadge.tsx`
- Modify: `apps/frontend/src/components/Player/index.tsx` (mount badge above `<TrackMeta/>`), `apps/frontend/src/components/Player/TrackMeta.tsx` (SplitText entrance on title change)
- Modify: `apps/frontend/src/components/Player/TrackArtwork.tsx` (share now uses the real moment phrase)
- Test: extend `apps/frontend/src/lib/shareTrack.test.ts` usage site — no new unit test needed beyond existing; badge is presentational.

**Interfaces:**
- Consumes: `useMoment`, `MOMENT_LABELS`, `MOMENT_SHARE_PHRASES` (Task 5), `gsap/SplitText` (free plugin — `import { SplitText } from 'gsap/SplitText'`, register once).
- Produces: `export function MomentBadge(): JSX.Element` — renders `«Nuit · 23h47»`: `font-display`, `text-accent`, small caps feel; clock updates once per minute (single interval). `TrackMeta` title animates per `sh_id` change: SplitText into chars, stagger `y: '0.6em' → 0`, `opacity 0 → 1`, 0.6 s total, killed + reverted on unmount; skipped under reduced-motion (falls back to existing `motion` trackFlip crossfade).

- [ ] **Step 1:** Implement `MomentBadge` (full code):

```tsx
// apps/frontend/src/components/Player/MomentBadge.tsx
import { useEffect, useState } from 'react';
import { useMoment } from '../../hooks/useMoment';
import { MOMENT_LABELS } from '../../lib/moments';

const fmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function MomentBadge() {
  const moment = useMoment();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="font-display text-sm tracking-widest uppercase text-accent/90 text-center mb-2">
      {MOMENT_LABELS[moment]} · {fmt.format(now)}
    </p>
  );
}
```

- [ ] **Step 2:** SplitText in `TrackMeta.tsx` — `useGSAP` keyed on `sh_id`; register plugin module-level (`gsap.registerPlugin(SplitText)`); guard reduced-motion. Wire `MOMENT_SHARE_PHRASES[moment]` into the `shareTrack` call in `TrackArtwork`.
- [ ] **Step 3: Verify** — dev: badge shows correct moment/time; title animates on track change; typecheck+tests+build pass.
- [ ] **Step 4: Commit** — `feat(frontend): moment badge and title entrance`.

---

## Phase 4 — Fil-journée

### Task 13: `groupByMoment` — pure day-timeline grouping

**Files:**
- Create: `apps/frontend/src/lib/dayTimeline.ts`
- Test: `apps/frontend/src/lib/dayTimeline.test.ts`

**Interfaces:**
- Consumes: `SongEntry` type (`lib/azuracast`), `getMoment`, `MOMENT_ORDER` (Task 5).
- Produces:

```ts
export interface MomentGroup { moment: Moment; entries: SongEntry[] }
export function groupByMoment(entries: SongEntry[]): MomentGroup[];
// entries assumed newest-first (AzuraCast order); output groups newest-first,
// entries within a group newest-first; empty moments omitted; an entry's moment
// derives from new Date(entry.played_at * 1000) local time.
export function dedupeBySongId(entries: SongEntry[]): SongEntry[]; // by sh_id, keep first
```

- [ ] **Step 1: Failing tests**

```ts
// apps/frontend/src/lib/dayTimeline.test.ts
import { describe, it, expect } from 'vitest';
import { groupByMoment, dedupeBySongId } from './dayTimeline';
import type { SongEntry } from '../lib/azuracast';

const entry = (sh_id: number, h: number): SongEntry =>
  ({ sh_id, played_at: new Date(2026, 6, 13, h).getTime() / 1000, duration: 200, playlist: '', streamer: '', is_request: false,
     song: { id: String(sh_id), art: '', text: '', artist: 'A', title: `T${sh_id}`, album: '', genre: '', isrc: '', lyrics: '' } }) as SongEntry;

describe('groupByMoment', () => {
  it('groups newest-first by moment, omitting empty moments', () => {
    const groups = groupByMoment([entry(3, 18), entry(2, 10), entry(1, 6)]);
    expect(groups.map((g) => g.moment)).toEqual(['dusk', 'day', 'dawn']);
    expect(groups[0].entries[0].sh_id).toBe(3);
  });
  it('keeps consecutive same-moment entries in one group', () => {
    const groups = groupByMoment([entry(2, 11), entry(1, 10)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].entries.map((e) => e.sh_id)).toEqual([2, 1]);
  });
});

describe('dedupeBySongId', () => {
  it('drops later duplicates of the same sh_id', () => {
    expect(dedupeBySongId([entry(1, 10), entry(1, 10), entry(2, 9)]).map((e) => e.sh_id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**

```ts
// apps/frontend/src/lib/dayTimeline.ts
import type { SongEntry } from './azuracast';
import { getMoment, type Moment } from './moments';

export interface MomentGroup {
  moment: Moment;
  entries: SongEntry[];
}

export function groupByMoment(entries: SongEntry[]): MomentGroup[] {
  const groups: MomentGroup[] = [];
  for (const e of entries) {
    const moment = getMoment(new Date(e.played_at * 1000));
    const last = groups[groups.length - 1];
    if (last && last.moment === moment) last.entries.push(e);
    else groups.push({ moment, entries: [e] });
  }
  return groups;
}

export function dedupeBySongId(entries: SongEntry[]): SongEntry[] {
  const seen = new Set<number>();
  return entries.filter((e) => (seen.has(e.sh_id) ? false : (seen.add(e.sh_id), true)));
}
```

- [ ] **Step 4: Run** — PASS. **Step 5: Commit** — `feat(frontend): day timeline grouping`.

### Task 14: `useDayHistory` — one fetch + live merge

**Files:**
- Create: `apps/frontend/src/hooks/useDayHistory.ts`
- Test: `apps/frontend/src/hooks/useDayHistory.test.ts` (MSW)
- Modify: `apps/frontend/src/mocks/handlers.ts` (add AzuraCast history handler fixture)
- Delete (in Task 15 once consumers are gone): `hooks/useStationHistory.ts`

**Interfaces:**
- Consumes: `AZURACAST_HISTORY_URL` pattern from the current `useStationHistory.ts` (read it, reuse `buildAzuracastUrls` from `@aubesonore/core/azuracast` + `utils/config.ts`), `useNowPlayingStore` (`song_history` for live freshness), `dedupeBySongId`.
- Produces: `export function useDayHistory(): { entries: SongEntry[]; isLoading: boolean; error: string | null }` — on mount fetches `?rows=120` once (covers a full day at ~4 min/track); merges `[...liveSongHistory, ...fetched]` deduped by `sh_id`, filtered to `played_at >= startOfToday 05:00` (the radio day starts at dawn; night tracks from 00:00–05:00 belong to yesterday's night and stay visible until 05:00 — implement: keep entries where `played_at >= (now.getHours() < 5 ? yesterday 22:00 : today 05:00 minus nothing)` — simplest correct rule: keep the last 24 h and let grouping label them; cap display in Task 15). Live poll keeps prepending via the store subscription (selector on `song_history`).

- [ ] **Step 1:** Write MSW handler + failing test asserting: initial fetch happens once, entries are deduped against live `song_history`, `isLoading` transitions. Use `makeNowPlaying()` fixture from `mocks/handlers.ts` for store shape.
- [ ] **Step 2: Run** — FAIL. **Step 3:** Implement (single `useEffect` fetch with `AbortController`, valibot `SongEntrySchema` array parse like `useStationHistory` does today — copy its validation approach).
- [ ] **Step 4: Run** — PASS. **Step 5: Commit** — `feat(frontend): useDayHistory (24h window, live merge)`.

### Task 15: `DayTimeline` UI — replace HistoryList/FullHistoryModal

**Files:**
- Create: `apps/frontend/src/components/Player/DayTimeline.tsx`
- Modify: `apps/frontend/src/components/Player/index.tsx` (swap `<HistoryList/>` → `<DayTimeline/>`), `apps/frontend/src/components/Player/HistoryItem.tsx` (time display: exact `HH:mm` via `Intl.DateTimeFormat` instead of `formatTimeAgo`; add share icon calling `shareTrack`)
- Delete: `apps/frontend/src/components/Player/HistoryList.tsx`, `apps/frontend/src/components/Player/FullHistoryModal.tsx`, `apps/frontend/src/hooks/useStationHistory.ts`

**Interfaces:**
- Consumes: `useDayHistory` (Task 14), `groupByMoment` (Task 13), `MOMENT_LABELS`, `HistoryItem` (existing props `{entry, isLiked, isLiking, onToggle}` — extend with `onShare: () => void`), `useLikedTracksStore` + `useLikeAction` (existing, copy the wiring from current `HistoryList.tsx` before deleting it).
- Produces: `export function DayTimeline(): JSX.Element` — section per `MomentGroup`: sticky header `«Crépuscule — 17h à 22h»` (`font-display`, `data-moment-section={moment}` attribute for Task 16's ScrollTrigger), then `HistoryItem` rows. Initial render shows the two most recent groups fully; older groups behind a `«Remonter la journée»` button (simple `useState` reveal — no virtualization, ≤ ~360 rows worst case).

- [ ] **Step 1:** Implement `DayTimeline` (reuse like/share wiring from old `HistoryList`), update `HistoryItem` (exact time + share button), swap into `Player/index.tsx`.
- [ ] **Step 2:** Delete the three replaced files; `grep -rn "HistoryList\|FullHistoryModal\|useStationHistory" apps/frontend/src` → nothing.
- [ ] **Step 3: Verify** — dev: timeline groups correctly around a real moment boundary (compare with AzuraCast history), likes toggle, share works from a row; typecheck+tests+build. **Milestone: screenshot for Victor (fil-journée).**
- [ ] **Step 4: Commit** — `feat(frontend): day timeline replaces flat history`.

### Task 16: Scroll narrative — sky replays the traversed moment

**Files:**
- Create: `apps/frontend/src/components/Sky/useScrollSky.ts`
- Modify: `apps/frontend/src/components/Sky/SkyBackground.tsx` (add a fourth layer `.sky-scroll-overlay`; call `useScrollSky`), `apps/frontend/src/components/Sky/sky.css`

**Interfaces:**
- Consumes: `[data-moment-section]` markers rendered by `DayTimeline` (Task 15), `gsap/ScrollTrigger`.
- Produces: `export function useScrollSky(): void` — registers ScrollTrigger; for each `[data-moment-section]`, a trigger (start `top 60%`, end `bottom 60%`, scrub 0.6) that fades in `.sky-scroll-overlay` painted with THAT moment's gradient (read stops via `getComputedStyle` on a probe element carrying `data-moment`, or hardcode the same palette map imported from a shared `SKY_STOPS` record exported from `lib/moments.ts` — choose the record: single source, no DOM probing; add `export const SKY_STOPS: Record<Moment, [string, string, string]>` to `lib/moments.ts` and make `index.css` values match it verbatim, with a comment in both files pointing at each other). Overlay opacity returns to 0 when no section is active (top of page = present). **Scroll touches only this overlay — `data-moment`, tokens, and the badge stay clock-driven (spec §5).** Disabled entirely under reduced-motion. Triggers refreshed when `DayTimeline` reveals older groups (call `ScrollTrigger.refresh()` after the reveal state flips — expose via a custom event `aubesonore:timeline-expanded` dispatched by DayTimeline, listened to here).
- [ ] **Step 1:** Add `SKY_STOPS` to `lib/moments.ts` + sync comment in `index.css`.
- [ ] **Step 2:** Implement `useScrollSky` + overlay layer (`position:absolute; inset:0; opacity:0; background: linear-gradient(...)` rewritten per active section via `gsap.set` on enter).
- [ ] **Step 3: Verify** — dev: scrolling into «Aube» section warms the sky, scrolling back to top restores the present; badge/accents unchanged during scroll; reduced-motion: no effect; mobile scroll smoothness (devtools CPU throttle 4×: no jank — the overlay is one composited opacity tween).
- [ ] **Step 4: Verify build+tests. Commit** — `feat(frontend): scroll narrative sky replay`.

---

## Phase 5 — Nettoyage final & QA

### Task 17: Codebase sweep

**Files:** repo-wide `apps/frontend` + `packages/*` (read-only check), `vite.config.ts`, `vitest.config.ts`, `index.html`

- [ ] **Step 1: Dead exports/deps audit** — run `pnpm dlx knip --workspace apps/frontend` (or `pnpm dlx depcheck apps/frontend`); review each finding MANUALLY (knip false-positives on vite plugins/sw). Expected removals to confirm: none of `@aubesonore/core/stats` frontend imports remain (package module stays for mobile); `@fontsource/inter` is now genuinely used (main.tsx); no `framer-motion`, `satori`, `@resvg/resvg-wasm` anywhere including `pnpm-lock.yaml` frontend importer section.
- [ ] **Step 2: Config hygiene** — `vitest.config.ts` coverage excludes: drop entries for deleted files (ShareCard, shareUtils, statsStore); `vite.config.ts` manualChunks: confirm `motion`/`radix` chunks still match; PWA manifest: update `theme_color`/`background_color` to the night `--sky-1` value `#0b0d16` (compute the hex from `hsl(228 32% 5%)` — verify with a converter at implementation time and use the exact hex in both manifest and `index.html` `<meta name="theme-color">`).
- [ ] **Step 3: Copy & metadata** — `index.html` title/description still accurate; About modal copy mentions the day-cycle line (one sentence, French, vouvoiement-neutral radio voice); README frontend section updated (features list reflects cuts).
- [ ] **Step 4: Verify + commit** — full gate: `pnpm typecheck && pnpm lint && pnpm --filter @aubesonore/frontend test -- --run && pnpm --filter @aubesonore/frontend build`. Commit `chore(frontend): post-redesign cleanup sweep`.

### Task 18: QA gate + PR

- [ ] **Step 1: Bundle audit** — `pnpm --filter @aubesonore/frontend build`, open `stats.html` (visualizer): assert gsap chunk < what satori+resvg-wasm weighed (satori ~200 kB + wasm ~1.2 MB gone vs gsap core+ScrollTrigger+SplitText ~90 kB gz). Record numbers in the PR description.
- [ ] **Step 2: Manual QA matrix** — desktop Chrome + Firefox + mobile viewport: play/pause, like, share (Web Share on mobile emulation, clipboard on desktop), sleep timer, cast button presence, auth flow, PWA install banner, day timeline expand, scroll narrative, reduced-motion pass (devtools emulation), `data-moment` correctness at a simulated boundary (set system clock 16:59 → 17:01).
- [ ] **Step 3: Web vitals sanity** — dev console web-vitals logs: LCP < 2.5 s local, CLS ≈ 0 (sky is fixed/absolute, no layout shift).
- [ ] **Step 4: PR** — push `feat/frontend-redesign`, open PR to `master` titled `feat(frontend): day-cycle redesign`, body linking spec + plan, screenshots of the four moments (flip `data-moment` for captures), bundle numbers, and the feature-cut list. Note: PR #87 conflict resolution — this branch wins on all frontend files; #87 remains valuable for compose/docs only.

---

## Jalons de validation Victor (hors checkboxes)

1. Après Task 11 : capture ciel + typo (les 4 moments) — la palette `SKY_STOPS`/tokens peut être retouchée ici, elle vit à un seul endroit.
2. Après Task 15 : capture fil-journée.
3. Après Task 18 : preview Vercel de la PR pour validation finale avant merge.
