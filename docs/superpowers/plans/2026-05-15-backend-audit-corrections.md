# Backend Audit Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the 20 findings from the 4-angle backend audit (architecture, security, performance, tests/quality) and prepare the codebase for the documented 5-tier scaling roadmap, without over-engineering for an audience that doesn't exist yet.

**Architecture:** Bun 1.3 + Elysia 1.4 + Drizzle 0.45 + PostgreSQL + Better Auth 1.6. Mono-instance today; the changes here preserve the mono-instance footprint but introduce the abstractions (`CacheStore` interface, scaling doc) that make a future Redis migration painless.

**Tech Stack:** TypeScript strict, Valibot validators, Vitest backend tests, bun test runner. Conventions in `CLAUDE.md` (dotted routes, camelCase services).

---

## Phase 1 — Critical Quick Wins (≈ 2h)

### Task 1: Add DB Pool timeouts

**Files:**

- Modify: `apps/backend/src/db/index.ts`

- [ ] **Step 1: Add `statement_timeout` + `query_timeout` options to the Pool constructor**

```typescript
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 5_000, // kill server-side query after 5s
  query_timeout: 10_000, // client-side abort after 10s
  ...sslOptions,
});
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/backend && bun run typecheck`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/db/index.ts
git commit -m "perf(backend): add statement_timeout + query_timeout to pg Pool"
```

### Task 2: Eliminate redundant `auth.api.getSession()` calls

**Files:**

- Modify: `apps/backend/src/routes/track.routes.ts`
- Modify: `apps/backend/src/routes/preferences.routes.ts`
- Modify: `apps/backend/src/routes/push.routes.ts`
- Modify: `apps/backend/src/lib/auth/index.ts` (enable cookieCache)

- [ ] **Step 1: Enable Better Auth secondary cookie cache**

In `apps/backend/src/lib/auth/index.ts`, add to the auth config:

```typescript
session: {
  cookieCache: { enabled: true, maxAge: 5 * 60 }, // 5min, signed cookie
  // existing fields preserved
},
```

- [ ] **Step 2: Remove `auth.api.getSession({ headers })` re-invocation from each `.derive()`**

The Elysia `betterAuthPlugin` already exposes `context.session` / `context.user`. Replace the `.derive(getSession)` pattern with reads from the already-populated context.

- [ ] **Step 3: Run backend tests**

Run: `cd apps/backend && bun test`
Expected: all green (no regressions)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/lib/auth/index.ts apps/backend/src/routes/*.routes.ts
git commit -m "perf(backend): enable Better Auth cookie cache + remove double getSession in routes"
```

### Task 3: Extract `hasError` + `ServiceResponse<T>` into a shared helper

**Files:**

- Create: `apps/backend/src/lib/routeHelpers.ts`
- Modify: `apps/backend/src/routes/track.routes.ts`
- Modify: `apps/backend/src/routes/preferences.routes.ts`
- Modify: `apps/backend/src/routes/push.routes.ts`

- [ ] **Step 1: Create `lib/routeHelpers.ts`**

```typescript
export interface ServiceResponse<T> {
  data?: T;
  error?: string;
  status?: number;
}

export function hasError<T>(r: ServiceResponse<T>): r is ServiceResponse<T> & { error: string } {
  return typeof r.error === 'string';
}

export function respondWith<T>(
  result: ServiceResponse<T>,
  set: { status: number }
): T | { error: string } {
  if (hasError(result)) {
    set.status = result.status ?? 400;
    return { error: result.error };
  }
  return result.data as T;
}
```

- [ ] **Step 2: Replace duplicated definitions in the 3 routes** with `import { hasError, ServiceResponse, respondWith } from '../lib/routeHelpers'`.

- [ ] **Step 3: Run typecheck + tests**

Run: `cd apps/backend && bun run typecheck && bun test`

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/lib/routeHelpers.ts apps/backend/src/routes/*.routes.ts
git commit -m "refactor(backend): extract hasError + ServiceResponse to lib/routeHelpers"
```

### Task 4: Replace `console.*` with `logger`

**Files:**

- Modify: `apps/backend/src/services/mailerService.ts`
- Modify: `apps/backend/src/lib/auth/sendBetterAuthEmail.ts`
- Modify: `apps/backend/src/services/songlinkService.ts`
- Modify: `apps/backend/src/services/lastfmService.ts`

- [ ] **Step 1: Audit grep**: `grep -rn "console\.\(log\|error\|warn\)" apps/backend/src/`

- [ ] **Step 2: Replace each occurrence** with `logger.info/error/warn` from the project's logger module (already used in `index.ts`, `migrate.ts`).

- [ ] **Step 3: Run typecheck**

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services apps/backend/src/lib/auth
git commit -m "refactor(backend): unify logging via structured logger"
```

### Task 5: Rate-limit `/api/artist`

**Files:**

- Modify: `apps/backend/src/routes/artist.routes.ts`

- [ ] **Step 1: Install/use an Elysia rate-limit plugin** OR implement a per-IP TTL map. Choose the lightest path that's already in deps.

- [ ] **Step 2: Apply: 10 req/min per IP on `GET /api/artist`**

- [ ] **Step 3: Test with curl**

```bash
for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3000/api/artist?name=test'; done
```

Expected: 200 ×10 then 429 ×5.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/routes/artist.routes.ts
git commit -m "feat(backend): rate-limit /api/artist (10 req/min per IP)"
```

### Task 6: Fix `/api/artist` route prefix inconsistency

**Files:**

- Modify: `apps/backend/src/routes/artist.routes.ts`

- [ ] **Step 1: Change `.prefix('/api')` to `.prefix('/api/artist')`** and update the inner route path to remove the `/artist` segment.

- [ ] **Step 2: Verify the frontend `useArtistInfo.ts` still hits the correct URL** (run `grep -rn "/api/artist" apps/frontend/src` to confirm).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/routes/artist.routes.ts
git commit -m "refactor(backend): align artist route prefix with other resources"
```

### Task 7: Fix error swallowing in `songlinkService.getSonglinkData`

**Files:**

- Modify: `apps/backend/src/services/songlinkService.ts`

- [ ] **Step 1: Differentiate error types** (timeout vs 4xx vs 5xx vs invalid JSON). Only cache `null` for confirmed 404 / not-found. Re-throw or return a tagged error for transient failures.

- [ ] **Step 2: Update the caller** (`searchSonglink`) to NOT cache transient errors.

- [ ] **Step 3: Add a unit test** for the timeout path (mock `fetch` with AbortError).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/songlinkService.ts apps/backend/tests
git commit -m "fix(backend): differentiate transient vs permanent errors in songlinkService"
```

---

## Phase 2 — Logic Refactor (≈ 3h)

### Task 8: Extract `authPlugin` Elysia

**Files:**

- Create: `apps/backend/src/lib/auth/authPlugin.ts`
- Modify: 3 routes to use it

- [ ] **Step 1: Create the plugin** that runs the auth check once and exposes `{ user, session }` via `.derive`.

- [ ] **Step 2: Apply** to track/preferences/push routes; remove duplicated `.derive`.

- [ ] **Step 3: Run tests + typecheck**

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/lib/auth/authPlugin.ts apps/backend/src/routes
git commit -m "refactor(backend): extract authPlugin for shared session derivation"
```

### Task 9: Concurrent coalescing in caches

**Files:**

- Modify: `apps/backend/src/lib/cache/ttlCache.ts`
- Modify: `apps/backend/src/services/songlinkService.ts` (call site)
- Modify: `apps/backend/src/services/lastfmService.ts` (call site)

- [ ] **Step 1: Change cache value type** from `T` to `T | Promise<T>`. Store the in-flight Promise so concurrent reads dedupe.

- [ ] **Step 2: Add unit tests** for concurrent reads on the same key (only 1 fetch fired).

- [ ] **Step 3: Commit**

### Task 10: Cursor pagination on `getLikedTracks`

**Files:**

- Modify: `apps/backend/src/services/trackService.ts`
- Modify: `apps/backend/src/routes/track.routes.ts`
- Modify: `apps/frontend/src/lib/api.ts` (consumer)
- Modify: `apps/frontend/src/contexts/LikedTracksContext.tsx`

- [ ] **Step 1: Add `?cursor=ISO_DATE&limit=50` query params**, return `{ data, nextCursor }`.

- [ ] **Step 2: Drop `platformLinks` from the listing projection** (load on demand via track detail endpoint).

- [ ] **Step 3: Adapt frontend** to consume the cursor (load-more pattern).

- [ ] **Step 4: Tests + commit**

### Task 11: Async `refreshAllLinks`

**Files:**

- Modify: `apps/backend/src/services/trackService.ts`
- Modify: `apps/backend/src/routes/track.routes.ts`

- [ ] **Step 1: Route returns 202 + job id immediately**, schedules the refresh as a tracked background promise.

- [ ] **Step 2: Track in-flight refreshes** in a Set so `gracefulShutdown` awaits them.

- [ ] **Step 3: Commit**

### Task 12: Lazy-init `webPush.setVapidDetails`

**Files:**

- Modify: `apps/backend/src/services/pushService.ts`

- [ ] **Step 1: Wrap setVapidDetails in `getTransporter()`** called lazily by `sendToOne`/`sendToAll`. Remove top-level side effect.

- [ ] **Step 2: Add a test** that imports pushService without env set (must not throw).

- [ ] **Step 3: Commit**

### Task 13: Track background promises for graceful shutdown

**Files:**

- Create: `apps/backend/src/lib/backgroundTasks.ts`
- Modify: `apps/backend/src/services/trackService.ts` (replace `void enrichTrackInBackground(...)`)
- Modify: `apps/backend/src/index.ts` (await pending on SIGTERM)

- [ ] **Step 1: Create a small `BackgroundTaskRegistry`** with `register(promise)` + `waitAll(timeoutMs)`.

- [ ] **Step 2: Wire `enrichTrackInBackground` through it.**

- [ ] **Step 3: `gracefulShutdown` awaits `registry.waitAll(5000)` before `pool.end()`.**

- [ ] **Step 4: Test the SIGTERM path** with a long-running mocked enrichment.

- [ ] **Step 5: Commit**

---

## Phase 3 — Tests (≈ 4h)

### Task 14: `trackService` unit tests

**Files:**

- Create: `apps/backend/tests/services/trackService.test.ts`

- [ ] **Step 1: Cover** `likeTrack` happy path + duplicate handling + `unlikeTrack` + ownership check + `refreshTrackLinks` cooldown + TOCTOU re-check.

- [ ] **Step 2: Run + commit**

### Task 15: `songlinkService` tests

**Files:**

- Create: `apps/backend/tests/services/songlinkService.test.ts`

- [ ] **Step 1: Cover** timeout (cache MUST NOT be set), 404 (cache null OK), 500 (no cache), success path + cache hit dedup.

- [ ] **Step 2: Commit**

### Task 16: `lastfmService` tests

**Files:**

- Create: `apps/backend/tests/services/lastfmService.test.ts`

- [ ] **Step 1: Cover** circuit breaker open/close, 429 handling, bio HTML cleaning.

- [ ] **Step 2: Commit**

### Task 17: `pushService` tests

**Files:**

- Create: `apps/backend/tests/services/pushService.test.ts`

- [ ] **Step 1: Cover** chunking of 50, 410/404 prune, sendToOne happy path, lazy init.

- [ ] **Step 2: Commit**

### Task 18: Validators tests

**Files:**

- Create: `apps/backend/tests/validators/trackValidator.test.ts`
- Create: `apps/backend/tests/validators/preferencesValidator.test.ts`
- Modify: `apps/backend/tests/validators/pushValidator.test.ts` (extend to subscribe + sendPush)

- [ ] **Step 1: Cover all schemas** with valid + invalid inputs.

- [ ] **Step 2: Commit**

---

## Phase 4 — Scaling Foundations (≈ 2h)

### Task 19: Cache abstraction (`CacheStore` interface)

**Files:**

- Modify: `apps/backend/src/lib/cache/ttlCache.ts`

- [ ] **Step 1: Extract a `CacheStore<V>` interface** with `get/set/delete`. The current in-memory class implements it.

- [ ] **Step 2: Type-erase consumers** to use `CacheStore<V>` not `TtlCache<V>`. A future `RedisCacheStore` impl will plug in without touching call sites.

- [ ] **Step 3: Document the swap procedure** in `CLAUDE.md` (1 paragraph).

- [ ] **Step 4: Commit**

### Task 20: Scaling roadmap doc in `CLAUDE.md`

**Files:**

- Modify: `C:\Users\ordiv\AubeSonore\CLAUDE.md`

- [ ] **Step 1: Add a `## Scaling roadmap` section** with the 5-tier table from session output (P0–P4 with listener counts, bandwidth, costs, triggers, actions).

- [ ] **Step 2: Add explicit "swap to Redis triggers"** :
  - Any horizontal scaling (>1 backend replica)
  - Pic listeners > 500/sustained
  - Cache hit ratio < 50% measured for >24h

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add 5-tier scaling roadmap with explicit Redis migration triggers"
```

---

## Final verification

- [ ] `cd apps/backend && bun run typecheck` — 0 errors
- [ ] `cd apps/backend && bun test` — all green
- [ ] `pnpm lint` (root) — 0 errors
- [ ] `cd apps/backend && bun run build` (if applicable) — OK
- [ ] git log — N commits applied, no untracked work in plan scope
