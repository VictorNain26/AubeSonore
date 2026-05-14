# Frontend Overhaul — Design Spec

**Date:** 2026-05-14 (revised after tech-lead review)
**Scope:** `apps/frontend` — tooling, tests, error handling, performance, lint, quick wins
**Out of scope:** UI/design changes, routing (single page), external monitoring (personal project)
**Option:** B — Modern toolchain complet

---

## Context

Audit score: 7.4/10. The frontend is structurally sound (React 19, Vite 8, Tailwind 4, Zustand 5, TypeScript strict) but has three structural gaps:

1. **Tests:** 3 files / 69 sources (ratio 0.04). No coverage on any critical path.
2. **Silent failures:** `player.ts`, `api.ts`, `usePushNotifications`, `azuracast.ts` all swallow errors without surfacing them.
3. **No error boundaries:** a single component crash produces a blank screen.

### Verified library versions (May 2026)

| Package                         | Version | Notes                                                          |
| ------------------------------- | ------- | -------------------------------------------------------------- |
| `msw`                           | 2.14.6  | Native SSE support via `sse` namespace                         |
| `@testing-library/react`        | 16.3.2  | peer `^18 \|\| ^19`                                            |
| `vitest`                        | 4.1.6   | coverage option = `coverage.thresholds.<metric>` (no `global`) |
| `react-error-boundary`          | 6.1.1   | React 19 still has no native ErrorBoundary component           |
| `eslint-plugin-jsx-a11y`        | 6.10.2  | Flat config via `jsxA11y.flatConfigs.recommended`              |
| `@vitest/eslint-plugin`         | 1.6.17  | Official package name (not `eslint-plugin-vitest`)             |
| `eslint-plugin-testing-library` | 7.16.2  | Flat config via `testingLibrary.configs['flat/react']`         |
| `web-vitals`                    | 5.2.0   | INP is officially a Core Web Vital since 2024                  |
| `rollup-plugin-visualizer`      | 7.0.1   | Vite 8 compat (Rollup 4)                                       |

---

## Section 1 — Testing

### New dependencies

- `@testing-library/react@16` — component rendering and querying
- `@testing-library/user-event@14` — realistic user interactions
- `@testing-library/jest-dom@6` — expressive matchers
- `msw@2.14` — Mock Service Worker, intercepts `fetch()` and SSE at the network level
- `@vitest/eslint-plugin@1` — vitest lint
- `eslint-plugin-testing-library@7` — RTL anti-pattern prevention

### MSW setup

- `src/mocks/handlers.ts` — REST handlers (backend `/api/*`)
- `src/mocks/sse-handlers.ts` — SSE handlers using `import { sse } from 'msw'` for AzuraCast `/api/live/nowplaying/sse`
- `src/mocks/server.ts` — `setupServer(...handlers, ...sseHandlers)` for Node
- `src/mocks/setup.ts` — `beforeAll/afterEach/afterAll` lifecycle, wired in `vitest.config.ts > setupFiles`

### Coverage threshold (Vitest 4 syntax)

```ts
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.test.{ts,tsx}',
    'src/**/*.spec.{ts,tsx}',
    'src/mocks/**',
    // Visual-only components — covered by manual QA, not unit tests
    'src/components/Player/AlbumArt.tsx',
    'src/components/Player/WaveformProgress.tsx',
    'src/components/ShareCard/ShareCardRenderer.tsx',
    'src/main.tsx',
    'src/sw.ts',
  ],
  thresholds: {
    statements: 70,
    branches: 65,
    functions: 70,
    lines: 70,
  },
},
```

### Per-file environment (Vitest 4)

`environmentMatchGlobs` is deprecated. Replace with annotation at top of each `.tsx` test file:

```ts
// @vitest-environment jsdom
```

Default `environment: 'node'` stays for `.ts` tests.

### Test targets

| File                                 | Test type   | Key scenarios                                                                                                                  |
| ------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `lib/player.ts`                      | unit        | play/stop/volume, **AbortError on double-click filtered**, **error event from `stop()` not surfaced as playError**, HMR safety |
| `lib/api.ts`                         | unit        | `fetchApi` 4xx/5xx, network error, `getSession` distinguishes 401 (null) vs error (throw)                                      |
| `lib/azuracast.ts` (`useNowPlaying`) | unit        | SSE connect via MSW `sse()`, update message, reconnect, REST fallback via static endpoint                                      |
| `hooks/useAuth.ts`                   | unit        | session load, signIn/signOut, error state distinct from "not authenticated"                                                    |
| `hooks/usePushNotifications.ts`      | unit        | subscribe happy path, permission denied → discriminated reason, vapid key missing → discriminated reason                       |
| `hooks/usePreferences.ts`            | unit        | fetch, update                                                                                                                  |
| `hooks/useArtistInfo.ts`             | unit        | cache hit, cache miss, 404                                                                                                     |
| `contexts/LikedTracksContext.tsx`    | integration | optimistic like, rollback on error, optimistic unlike, rollback                                                                |
| `components/AuthModal.tsx`           | component   | open/close, form submit, error display                                                                                         |
| `components/LikedTracksModal.tsx`    | component   | empty state, list render, unlike, export                                                                                       |
| `components/NotificationBanner.tsx`  | component   | show on push enabled, hide on dismiss                                                                                          |
| `stores/sleepTimerStore.ts`          | unit        | set/cancel/trigger                                                                                                             |
| `stores/castStore.ts`                | unit        | state transitions                                                                                                              |

### Test conventions

- Assertions test behavior, not implementation details
- No shared mutable state (`beforeEach` resets MSW handlers via `server.resetHandlers()`)
- Error paths tested explicitly
- No snapshot tests
- React 19 + RTL: `act()` warnings emit as `console.warn` (not `error`) — failing on console warnings catches them

---

## Section 2 — Error Boundaries + Silent Failures

### Why `react-error-boundary` (not native React 19)

React 19 added `onCaughtError`/`onUncaughtError` callbacks on `createRoot`, but **did not** add a native `<ErrorBoundary>` component. The class-based pattern with `componentDidCatch` is still required. `react-error-boundary@6.1.1` provides this with hooks-friendly API and remains the standard.

### Error boundaries placement

Wrap in `App.tsx`:

- `<Player>` — fallback: dismiss + reload message
- `<LikedTracksModal>` (lazy) — fallback: dismiss button
- `<AuthModal>` (lazy) — fallback: dismiss button

### Silent failures to fix

**`lib/player.ts:play()`** — catches error, logs, sets `isPlaying: false` silently.
Fix: store adds `playError: { code: 'aborted' | 'network' | 'unknown'; message: string } | null`.

- **`AbortError`** (double-click race): filtered — set `isPlaying: false` only, no `playError`
- Errors triggered by `stop()` setting `audio.src = ''`: filtered via a `isStopping` ref to avoid false positive
- All other errors: `playError` set, surfaced as toast in Player component

**`lib/player.ts:initAudioContext()`** — `MediaElementAudioSourceNode` can only be created once per audio element. HMR re-import throws `InvalidStateError`.
Fix: guard with module-level `sourceNode !== null` check (already present), but additionally store the audio element reference and skip re-creation when HMR fires (`import.meta.hot?.accept` no-op handler).

**`lib/api.ts:getSession()`** — returns `null` on any error (network, 401, parse).
Fix: `401`/`403` → return `null` (valid "no session"). Network/parse errors → `throw`. `useAuth` catches the throw and sets an `authError` flag distinct from `isAuthenticated: false`.

**`lib/azuracast.ts:onmessage`** — `catch {}` swallows all parse errors.
Fix: check `event.data === '{}'` || `event.data === ''` before parsing. Log real parse errors with `console.warn('[SSE] Unexpected message:', event.data, err)`.

**`hooks/usePushNotifications.ts:subscribe()`** — returns `boolean`.
Fix: return discriminated union:

```ts
type SubscribeResult =
  | { success: true }
  | {
      success: false;
      reason: 'permission-denied' | 'vapid-missing' | 'server-error' | 'unknown';
      cause?: Error;
    };
```

**`contexts/LikedTracksContext.tsx:checkLiked()`** — returns `null` silently on error.
Fix: throw the error. This method is exposed in the context interface but currently has zero callers — likely dead. Mark as `@deprecated` in JSDoc with note: remove if still unused at the end of the overhaul.

### Network boundary validation (Valibot)

Add `src/lib/validators/azuracast.ts` with `NowPlayingSchema` matching the existing TypeScript types. Used at:

- SSE `onmessage` payload: `safeParse(NowPlayingSchema, parsed.connect.subs[...].publications[0].data.np)`
- REST fallback response: same schema

Invalid shape → `console.error('[AzuraCast] Invalid payload shape:', issues)` + drop the message (do not update state). The `error` state of `useNowPlaying` stays `null` since this is a backend bug, not a user-visible network failure.

### AzuraCast REST fallback (revised)

Original spec used `/api/nowplaying/{shortcode}` which returns 404 on the production instance. Replace with the **static endpoint** `/api/nowplaying_static/{shortcode}.json` — AzuraCast writes this file on each track change, zero PHP cost, always available when SSE is configured.

Implementation in `useNowPlaying`:

1. On mount: fire `fetch(${AZURACAST_URL}/api/nowplaying_static/${STATION_SHORTCODE}.json)` AND open SSE in parallel
2. First successful response (validated by Valibot) → update state
3. SSE continues to update after that
4. If REST 404s: log `console.info('[AzuraCast] Static endpoint not available, relying on SSE only')` once. No loop, no retry, no error state.

---

## Section 3 — Performance + Bundle + Web Vitals

### Bundle analysis

`rollup-plugin-visualizer@7` added to `vite.config.ts`:

```ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  // ...existing
  visualizer({
    filename: 'dist/stats.html',
    emitFile: true,
    gzipSize: true,
    brotliSize: true,
  }) as PluginOption,
],
```

`dist/stats.html` is in `dist/` (already gitignored). Generated on every build, viewed locally with `open dist/stats.html`.

### RAF loop fix

`Player/index.tsx:71-91`: the `requestAnimationFrame` loop runs unconditionally when `duration > 0`, even when paused. Fix:

```ts
useEffect(() => {
  if (!isPlaying || duration <= 0) return;
  // ...existing animate loop
}, [duration, isPlaying]);
```

Eliminates continuous CPU usage on a paused tab. Also fixes `useEffect` dependency array (currently misses `isPlaying`).

### Web Vitals (dev-only)

`src/main.tsx`:

```ts
if (import.meta.env.DEV) {
  void import('web-vitals').then(({ onLCP, onCLS, onINP }) => {
    onLCP((m) => console.debug('[CWV] LCP', m));
    onCLS((m) => console.debug('[CWV] CLS', m));
    onINP((m) => console.debug('[CWV] INP', m));
  });
}
```

Dynamic import in `if (DEV)` block → tree-shaken out of prod bundle.

### Vite config review

- Confirm `build.sourcemap: false` in prod
- No `manualChunks` needed (framer-motion ~150KB gzip is the largest dep — acceptable)
- Verify lazy imports (`LikedTracksModal`, `AuthModal`) are correctly split via `stats.html`

---

## Section 4 — Accessibility + Lint

### `eslint-plugin-jsx-a11y@6.10.2`

Flat config addition:

```ts
import jsxA11y from 'eslint-plugin-jsx-a11y';

{
  files: ['apps/frontend/**/*.{ts,tsx}', 'apps/mobile/**/*.{ts,tsx}'],
  ...jsxA11y.flatConfigs.recommended,
  rules: {
    ...jsxA11y.flatConfigs.recommended.rules,
    // Initially warn — bump to error once existing violations are fixed
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
  },
},
```

### `no-explicit-any` → `error`

`eslint.config.js` line change in the `{ files: ['**/*.{ts,tsx}'] }` block. Fix existing violations as part of the lint step (last in implementation order to avoid test-file churn).

### Testing lint rules

```ts
import vitest from '@vitest/eslint-plugin';
import testingLibrary from 'eslint-plugin-testing-library';

// vitest rules — applied to test files
{
  files: ['**/*.{test,spec}.{ts,tsx}'],
  plugins: { vitest },
  rules: {
    ...vitest.configs.recommended.rules,
    'vitest/expect-expect': 'error',
    'vitest/no-disabled-tests': 'warn',
    'vitest/no-focused-tests': 'error',
  },
},
// testing-library rules — applied to component test files
{
  files: ['**/*.{test,spec}.tsx'],
  ...testingLibrary.configs['flat/react'],
},
```

### Coverage threshold in CI

`.github/workflows/ci.yml` — modify the existing `Frontend tests` step:

```yml
- name: Frontend tests with coverage
  run: pnpm --filter=@aubesonore/frontend test --run --coverage
```

Threshold defined in `vitest.config.ts` fails the run if not met.

---

## Section 5 — Quick Wins from Audit

| Location                                    | Change                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `.gitignore`                                | Add `*.pem`, `*.key`, `*.p12`                                                                                                 |
| `apps/backend/src/routes/push.routes.ts:54` | Replace `(body as ...).endpoint` with `validateBody(unsubscribeSchema, body)`. Add `unsubscribeSchema` to `pushValidator.ts`. |
| `eslint.config.js`                          | `@typescript-eslint/no-explicit-any: 'error'`                                                                                 |
| `CLAUDE.md`                                 | Update versioning baseline: SDK 54 (RN 0.81) → SDK 55 (RN 0.83)                                                               |

---

## Architecture invariants (post-overhaul)

- **Network boundary validation:** all data crossing the network (SSE, REST, backend API) is validated with Valibot before touching state
- **No silent failures:** every `catch` block either re-throws, sets visible error state, or logs with `console.warn/error` — never `catch {}`
- **Error boundaries at component level:** no full-page white screen possible from a single component crash
- **Test coverage ≥ 70% (statements/functions/lines), ≥ 65% branches:** enforced in CI, excludes visual-only components
- **`any` forbidden:** `@typescript-eslint/no-explicit-any: error`
- **Audio invariants:** `AudioContext` initialized once per tab, `MediaElementAudioSourceNode` created once per element, `AbortError`/`stop()`-triggered errors filtered from user-visible error state

---

## Dependencies summary (new)

| Package                         | Version | Where            | Purpose                           |
| ------------------------------- | ------- | ---------------- | --------------------------------- |
| `@testing-library/react`        | ^16.3   | frontend devDeps | Component testing                 |
| `@testing-library/user-event`   | ^14     | frontend devDeps | Realistic interactions            |
| `@testing-library/jest-dom`     | ^6      | frontend devDeps | DOM matchers                      |
| `msw`                           | ^2.14   | frontend devDeps | Network-level mocking (incl. SSE) |
| `@vitest/eslint-plugin`         | ^1.6    | root devDeps     | Vitest lint                       |
| `eslint-plugin-testing-library` | ^7      | root devDeps     | RTL lint                          |
| `eslint-plugin-jsx-a11y`        | ^6.10   | root devDeps     | A11y lint                         |
| `react-error-boundary`          | ^6.1    | frontend deps    | Error boundaries                  |
| `rollup-plugin-visualizer`      | ^7      | frontend devDeps | Bundle analysis                   |
| `web-vitals`                    | ^5.2    | frontend deps    | CWV metrics (dev only)            |

---

## Implementation order (revised after review)

The original order had ESLint before tests, which would churn test files when `no-explicit-any: error` lands. Revised:

1. **Quick wins** (Section 5) — 15 min, unblocks everything
2. **`react-error-boundary` + silent failure fixes** — refactors `player.ts`, `api.ts`, `azuracast.ts`, `usePushNotifications.ts`
3. **AzuraCast static fallback + Valibot validation at SSE/REST boundary**
4. **RAF loop fix + web-vitals + bundle analyzer**
5. **MSW setup + test infrastructure** (handlers, server, setup file, vitest config migration)
6. **Unit tests** (lib, hooks, stores) — written against the now-corrected silent failures
7. **Integration tests** (contexts, components)
8. **ESLint additions** (`jsx-a11y`, `@vitest/eslint-plugin`, `testing-library`) + bump `no-explicit-any` to `error` + fix all violations in one sweep
9. **CI coverage threshold**
10. **Final `pnpm typecheck && pnpm lint && pnpm test` pass**
