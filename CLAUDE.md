# AubeSonore — Project Instructions for Claude

A webradio: backend Bun + Elysia, frontend Vite + React 19, Expo mobile, pnpm monorepo orchestrated by Turbo.

## Stack at a glance

| Layer    | Tech                                                            |
| -------- | --------------------------------------------------------------- |
| Backend  | Bun 1.3, Elysia 1.4, Drizzle 0.45 + PostgreSQL, Better Auth 1.6 |
| Frontend | React 19.2, Vite 8, Tailwind 4.3, Zustand 5                     |
| Mobile   | Expo SDK 54, React Native 0.81, Reanimated 4, nativewind        |
| Tooling  | pnpm 10.28, Turbo 2.9, ESLint 9 flat, Vitest 3.2 + bun test     |

The README has setup details; this file is for Claude.

## Conventions

- **Commits** — Conventional Commits in English (`type(scope): description`). Enforced by `.husky/commit-msg` + `commitlint.config.js`. Types: feat, fix, chore, refactor, test, docs, style, perf, ci, build. Scope = app or module touched. Co-author trailer added automatically.
- **Branches** — short kebab-case in English (`feat/like-track-batch`, `fix/cors-prod`). Never push direct to `master`; always PR.
- **Code style** — Prettier (`.prettierrc.json`). Default to **no comments**. Named exports preferred over default. TypeScript strict everywhere (see `tsconfig.base.json`).
- **File naming** — backend uses dotted (`track.routes.ts`, `trackService.ts`), frontend uses PascalCase for components (`LikedTracksModal.tsx`) and camelCase for lib/hooks. Each layer is consistent internally.

## Workflow rules

- Run `pnpm typecheck && pnpm lint` before claiming work is done. `pnpm test` (frontend Vitest) and `pnpm --filter @aubesonore/backend test` (bun) for changes touching the relevant tested modules.
- **Don't bypass hooks** (`--no-verify`, `--no-gpg-sign`) — if a hook fails, fix the cause.
- **Trust internal boundaries** — Valibot/TypeBox validate at the HTTP boundary; internal functions assume validated input.
- **Stage explicitly** (`git add <file>`) — never `git add .`/`-A`.
- **YAGNI** — no abstractions for hypothetical future requirements. Don't add error handling for impossible cases. Three similar lines beat a premature helper.

## Quick map

```
apps/backend/src/
  config/env.ts        — env vars (centralized; never read process.env elsewhere)
  db/schema.ts         — Drizzle schema (source of truth)
  db/index.ts          — pg Pool + Drizzle instance
  lib/auth/            — Better Auth wiring + Elysia plugin
  lib/cache/ttlCache   — in-memory TTL cache
  lib/security/        — SSRF guards (urlValidation) + response headers
  routes/*.routes.ts   — Elysia routes (one file per resource)
  services/*Service.ts — business logic
  validators/          — Valibot schemas for inbound payloads

apps/frontend/src/
  components/    — UI components (PascalCase)
  contexts/      — React contexts
  hooks/         — custom hooks
  lib/           — utilities, API client, audio player
  pages/         — top-level routes (only HomePage today)
  stores/        — Zustand stores
  layout/        — app shell

apps/mobile/src/
  app/           — Expo Router screens
  components/    — RN components
  services/      — API clients
  stores/        — Zustand (shared slices from packages/core)

packages/
  core/          — platform-agnostic logic (slices, parsers, share helpers)
  shared-types/  — types shared backend ↔ clients
```

## Working with Better Auth (1.6)

- Config lives in `apps/backend/src/lib/auth/index.ts`. Cookies are `secure` + `httpOnly`; `sameSite: 'none'` in prod, `'lax'` in dev.
- Rate limits are tuned: 5/min sign-in, 3/min sign-up & forget-password.
- Email verification is **required** for new accounts (`requireEmailVerification: true`).
- Google + Spotify OAuth providers configured.

## Working with Drizzle

- Schema = `apps/backend/src/db/schema.ts`. Migrations in `apps/backend/drizzle/*.sql`.
- `bun db:push` syncs schema directly to the connected DB (used in dev + prod). `bun db:generate` builds versioned migrations (currently the snapshot meta has drifted from the source — push is more reliable).
- All indexes are declared inline in `schema.ts`. Migration `0002_perf_indexes.sql` is the canonical script for adding them to an existing DB.

## SSRF, headers, and other security baselines

- Never `fetch()` a user-supplied URL without `assertSafeUrl()` from `lib/security/urlValidation`. It blocks private IPv4/IPv6, link-local (`169.254.0.0/16` = cloud metadata), and enforces `https` in prod.
- `securityHeaders` Elysia plugin must stay mounted on the app (`X-Content-Type-Options`, `X-Frame-Options`, CSP, HSTS in prod). Don't remove from `index.ts`.
- Push notification endpoints must be `https://…` — validator enforces it.

## Performance landmarks

- `liked_tracks` payload deliberately excludes `artwork_base64`. The DB column still exists for legacy rows; do not re-add it to the projection in `getLikedTracks`. A proxy endpoint for cached covers is the long-term replacement (post-audit).
- `refreshAllLinks` runs in parallel chunks of 5 with a 500ms inter-chunk delay. Don't revert to per-track sleeps.
- `searchSonglink` and `searchItunes` are memoized in `lib/cache/ttlCache` with 7-day TTL. Multi-instance deployments will need Redis.
- `pushService.sendToAll` chunks of 50 in parallel + auto-prunes 410/404 subscriptions.

## What NOT to do

- Don't re-introduce unused deps (`axios`, `cheerio`, `@tanstack/react-query`, `react-router-dom`, `@elysiajs/cron`, `class-variance-authority`, `dayjs`, `react-intersection-observer`) — they were removed in the May 2026 audit. Use existing alternatives.
- Don't write per-package `pnpm-lock.yaml` or `bun.lock` — the root pnpm-lock is authoritative.
- Don't disable `requireEmailVerification` unless a temporary migration window is needed (and roll back immediately).
- Don't bypass `securityHeaders` plugin or the rate limits in Better Auth.
- Don't store `artwork_base64` in API responses — it gates 40+ MB on a 100-track list.

## ESLint typed rules (transitional)

The flat config activates `recommendedTypeChecked` plus `no-floating-promises`, `no-misused-promises`, `await-thenable`. Currently at `warn` level (~157 existing violations). New code should be clean; the backlog drops to zero PR by PR. Don't add `eslint-disable` to silence them — fix or `void`-annotate intentional fire-and-forget.

## Versioning baseline (May 2026)

These versions are what the audit aligned us to. Bumps are fine; majors should be PR'd alone:

- React 19.2, Vite 8, Tailwind 4.3
- Bun 1.3.14, Elysia 1.4.28
- Better Auth 1.6.11, Drizzle 0.45.2
- Expo SDK 55 (RN 0.83), New Architecture enabled. Note: SDK 56 needs RN 0.85. Plan major mobile bumps separately.
