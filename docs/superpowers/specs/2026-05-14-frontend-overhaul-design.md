# Frontend Overhaul — Design Spec

**Date:** 2026-05-14
**Scope:** `apps/frontend` — tooling, tests, error handling, performance, lint, quick wins
**Out of scope:** UI/design changes, routing (single page), external monitoring (personal project)
**Option:** B — Modern toolchain complet

---

## Context

Audit score: 7.4/10. The frontend is structurally sound (React 19, Vite 8, Tailwind 4, Zustand 5, TypeScript strict) but has three structural gaps:

1. **Tests:** 3 files / 69 sources (ratio 0.04). No coverage on any critical path.
2. **Silent failures:** `player.ts`, `api.ts`, `usePushNotifications`, `azuracast.ts` all swallow errors without surfacing them.
3. **No error boundaries:** a single component crash produces a blank screen.

---

## Section 1 — Testing

### New dependencies

- `@testing-library/react` — component rendering and querying
- `@testing-library/user-event` — realistic user interactions
- `@testing-library/jest-dom` — expressive matchers (`toBeInTheDocument`, `toHaveValue`…)
- `msw@2` — Mock Service Worker, intercepts `fetch()` at the network level (no module mocking)
- `eslint-plugin-testing-library` — prevents anti-patterns in test files
- `eslint-plugin-vitest` — enforces correct vitest usage

### MSW setup

- `src/mocks/handlers.ts` — all handler definitions (backend API + AzuraCast SSE fallback)
- `src/mocks/server.ts` — node server for Vitest
- `vitest.config.ts` `setupFiles: ['src/mocks/setup.ts']` — starts/resets MSW before each test

### Coverage threshold

`vitest.config.ts` — `coverageThreshold: { global: { statements: 70, branches: 70 } }`. CI blocks if not met.

### Test targets

| File                                 | Test type   | Key scenarios                                                   |
| ------------------------------------ | ----------- | --------------------------------------------------------------- |
| `lib/player.ts`                      | unit        | play/stop/volume, play failure propagation                      |
| `lib/api.ts`                         | unit        | `fetchApi` 4xx/5xx, network error, `getSession` null vs throw   |
| `lib/azuracast.ts` (`useNowPlaying`) | unit        | SSE connect, update message, reconnect, REST fallback           |
| `hooks/useAuth.ts`                   | unit        | session load, signIn/signOut, error state                       |
| `hooks/usePushNotifications.ts`      | unit        | subscribe happy path, permission denied, vapid key missing      |
| `hooks/usePreferences.ts`            | unit        | fetch, update                                                   |
| `hooks/useArtistInfo.ts`             | unit        | cache hit, cache miss, 404                                      |
| `contexts/LikedTracksContext.tsx`    | integration | optimistic like, rollback on error, optimistic unlike, rollback |
| `components/AuthModal.tsx`           | component   | open/close, form submit, error display                          |
| `components/LikedTracksModal.tsx`    | component   | empty state, list render, unlike, export                        |
| `components/NotificationBanner.tsx`  | component   | show on push enabled, hide on dismiss                           |
| `stores/sleepTimerStore.ts`          | unit        | set/cancel/trigger                                              |
| `stores/castStore.ts`                | unit        | state transitions                                               |

### Test conventions

- Assertions test behavior, not implementation details
- No shared mutable state between tests (`beforeEach` resets MSW handlers)
- Error paths tested explicitly (no assumption of success)
- No snapshot tests

---

## Section 2 — Error Boundaries + Silent Failures

### Error boundaries

Add `react-error-boundary` wrapping:

- `<Player>` — fallback: "Lecteur indisponible, rechargez la page" (no design change, minimal text)
- `<LikedTracksModal>` (lazy) — fallback: dismiss button + message
- `<AuthModal>` (lazy) — fallback: dismiss button + message

The boundary catches render errors and prevents full-page white screens.

### Silent failures to fix

**`lib/player.ts:play()`**
Current: catches error, logs, sets `isPlaying: false` silently.
Fix: store adds `playError: string | null`. The catch sets `playError` with `error.message`. Player component reads it and shows a toast.

**`lib/api.ts:getSession()`**
Current: returns `null` on any error (network down, 401, JSON parse failure).
Fix: `401` → return `null` (valid "no session"). Network/parse errors → `throw`. `useAuth` catches the throw and sets an `authError` flag distinct from "unauthenticated".

**`lib/azuracast.ts:onmessage`**
Current: `catch {}` swallows all parse errors to handle empty pings `{}`.
Fix: check `event.data === '{}'` or `event.data === ''` before parsing. Log real parse errors with `console.warn('[SSE] Unexpected message:', event.data)`.

**`hooks/usePushNotifications.ts:subscribe()`**
Current: returns `boolean`.
Fix: return `{ success: true } | { success: false; reason: 'permission-denied' | 'vapid-missing' | 'server-error' | 'unknown' }`. Callers get actionable failure reasons.

**`contexts/LikedTracksContext.tsx:checkLiked()`**
Current: returns `null` silently on error.
Fix: throw the error. Callers (currently none outside the context) can decide how to handle it. This is an internal method only used synchronously via `isTrackLiked` — the async `checkLiked` can remain but should not swallow.

### AzuraCast REST fallback

`useNowPlaying` currently has no initial data until SSE establishes. If SSE takes > 2s, the skeleton shows.
Fix: on mount, fire `GET ${AZURACAST_URL}/api/nowplaying/${STATION_SHORTCODE}` in parallel with SSE setup. First response wins for initial state. SSE continues to update after that.

This also adds a Valibot schema (`NowPlayingSchema`) validating the REST and SSE payloads at the network boundary. Invalid shape → `console.error` + ignore (do not update state with corrupt data).

---

## Section 3 — Performance + Bundle + Web Vitals

### Bundle analysis

`rollup-plugin-visualizer` added to `vite.config.ts` with `emitFile: true`. Generates `dist/stats.html`. Added to `.gitignore`. Run with `pnpm build --mode analyze` or always (file is in dist, not committed).

### RAF loop fix

`Player/index.tsx:71-91`: the `requestAnimationFrame` loop runs unconditionally when `duration > 0`, even when the player is paused/stopped. Fix: condition on `isPlaying && duration > 0`. Eliminates continuous CPU usage on a hidden/paused tab.

### Web Vitals

`web-vitals` added to `main.tsx`:

```ts
if (import.meta.env.DEV) {
  void import('web-vitals').then(({ onLCP, onCLS, onINP }) => {
    onLCP(console.debug);
    onCLS(console.debug);
    onINP(console.debug);
  });
}
```

Dev-only, no external call, no build impact in prod.

### Vite config review

- Confirm `build.sourcemap: false` in prod (no source leakage)
- Confirm `build.rollupOptions.output.manualChunks` not needed (framer-motion is the largest dep at ~150KB gzip — acceptable for current scale)

---

## Section 4 — Accessibility + Lint

### `eslint-plugin-jsx-a11y`

Added to `eslint.config.js` for `apps/frontend/**/*.{ts,tsx}`. Rules at `warn` level. Existing violations are surfaced but don't block CI immediately. New code must not introduce new violations (enforced by `--max-warnings` in CI after initial cleanup).

### `no-explicit-any` → `error`

`eslint.config.js` line change. All existing `any` in frontend source replaced with proper types before the PR lands.

### Testing lint rules

```js
// vitest files
'vitest/expect-expect': 'error',
'vitest/no-disabled-tests': 'warn',
'vitest/no-focused-tests': 'error', // blocks CI
// testing-library files
'testing-library/await-async-queries': 'error',
'testing-library/no-await-sync-queries': 'error',
'testing-library/no-debugging-utils': 'warn',
```

### Coverage threshold in CI

`pnpm --filter=@aubesonore/frontend test --run --coverage` added to CI `quality` job. Fails if below 70%.

---

## Section 5 — Quick Wins from Audit

| Location                                    | Change                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `.gitignore`                                | Add `*.pem`, `*.key`, `*.p12`                                                                                           |
| `apps/backend/src/routes/push.routes.ts:54` | Replace `(body as ...).endpoint` with `validateBody(endpointSchema, body)`. Add `endpointSchema` in `pushValidator.ts`. |
| `eslint.config.js`                          | `@typescript-eslint/no-explicit-any: 'error'`                                                                           |
| `CLAUDE.md`                                 | Update versioning baseline: SDK 54 (RN 0.81) → SDK 55 (RN 0.83)                                                         |
| `vitest.config.ts`                          | Add `coverage.thresholds`                                                                                               |

---

## Architecture invariants (post-overhaul)

- **Network boundary validation:** all data crossing the network (SSE, REST, backend API) is validated with Valibot before touching state
- **No silent failures:** every `catch` block either re-throws, sets visible error state, or logs with `console.warn/error` — never `catch {}`
- **Error boundaries at component level:** no full-page white screen possible from a single component crash
- **Test coverage ≥ 70%:** enforced in CI, not aspirational
- **`any` forbidden:** `@typescript-eslint/no-explicit-any: error`

---

## Dependencies summary (new)

| Package                         | Where            | Purpose                   |
| ------------------------------- | ---------------- | ------------------------- |
| `@testing-library/react`        | frontend devDeps | Component testing         |
| `@testing-library/user-event`   | frontend devDeps | Realistic interactions    |
| `@testing-library/jest-dom`     | frontend devDeps | DOM matchers              |
| `msw@2`                         | frontend devDeps | Network-level API mocking |
| `eslint-plugin-testing-library` | root devDeps     | Test lint                 |
| `eslint-plugin-vitest`          | root devDeps     | Vitest lint               |
| `eslint-plugin-jsx-a11y`        | root devDeps     | A11y lint                 |
| `react-error-boundary`          | frontend deps    | Error boundaries          |
| `rollup-plugin-visualizer`      | frontend devDeps | Bundle analysis           |
| `web-vitals`                    | frontend deps    | CWV metrics (dev only)    |

---

## Implementation order

1. Quick wins (15 min) — unblock everything else
2. ESLint additions + fix existing violations
3. `react-error-boundary` + silent failure fixes
4. AzuraCast REST fallback + Valibot schema
5. RAF loop fix + web-vitals + bundle analyzer
6. MSW setup + test infrastructure
7. Unit tests (lib, hooks, stores)
8. Integration tests (contexts, components)
9. CI coverage threshold
10. Final `pnpm typecheck && pnpm lint && pnpm test` pass
