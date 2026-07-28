# AubeSonore — Project Instructions for Claude

A webradio: backend Bun + Elysia, frontend Vite + React 19, pnpm monorepo orchestrated by Turbo.

## Stack at a glance

| Layer    | Tech                                                            |
| -------- | --------------------------------------------------------------- |
| Backend  | Bun 1.3, Elysia 1.4, Drizzle 0.45 + PostgreSQL, Better Auth 1.6 |
| Frontend | React 19.2, Vite 8, Tailwind 4.3, Zustand 5                     |
| Tooling  | pnpm 10.28, Turbo 2.9, ESLint 9 flat, Vitest 3.2 + bun test     |

The README has setup details; this file is for Claude.

## Conventions

- **Commits** — Conventional Commits in English (`type(scope): description`). Enforced by `.husky/commit-msg` + `commitlint.config.js`. Types: feat, fix, chore, refactor, test, docs, style, perf, ci, build. Scope = app or module touched. Co-author trailer added automatically.
- **Branches** — short kebab-case in English (`feat/like-track-batch`, `fix/cors-prod`). Never push direct to `master`; always PR.
- **Code style** — Prettier (`.prettierrc.json`). Default to **no comments**. Named exports preferred over default. TypeScript strict everywhere (see `tsconfig.base.json`).
- **File naming** — backend uses dotted (`track.routes.ts`, `trackService.ts`), frontend uses PascalCase for components (`LikedTracksModal.tsx`) and camelCase for lib/hooks. Each layer is consistent internally.

## Workflow rules

- Run `pnpm typecheck && pnpm lint` before claiming work is done. `pnpm test` (frontend Vitest) and `pnpm --filter @aubesonore/backend test` (bun) for changes touching the relevant tested modules.
- **`master` is branch-protected** — a PR merges only when the 3 required CI checks pass (`Quality (lint, typecheck, test, audit)`, `Backend tests (bun)`, `Build all`); no human review is required. Dependency updates flow through Renovate with auto-merge — see _Dependency automation_.
- **Don't bypass hooks** (`--no-verify`, `--no-gpg-sign`) — if a hook fails, fix the cause.
- **Trust internal boundaries** — Valibot/TypeBox validate at the HTTP boundary; internal functions assume validated input.
- **Stage explicitly** (`git add <file>`) — never `git add .`/`-A`.
- **YAGNI** — no abstractions for hypothetical future requirements. Don't add error handling for impossible cases. Three similar lines beat a premature helper.

## Deployment (self-hosted, pull-based)

The stack runs on the maintainer's own box. Merging to `master` is the whole deploy action — `scripts/deploy.sh`, driven by a **systemd user timer**, polls `git ls-remote` every 2 minutes and promotes `origin/master` when it moves (`git merge --ff-only` → `docker compose up -d --build` → wait for every healthcheck → prune images older than 72h).

- **Pull-based on purpose.** The repo is public, and GitHub warns that "forks of your public repository can potentially run dangerous code on your self-hosted runner machine" ([docs.github.com](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/manage-access)) — so no self-hosted runner, and no inbound webhook to expose. Polling needs no credential and no open port.
- **Schema changes stop the deploy.** `bun db:push` is manual and can drop columns, so the script refuses any revision where `apps/backend/src/db/schema.ts` differs. Apply the push by hand, then `systemctl --user start aubesonore-deploy`.
- Install once: symlink `scripts/systemd/*` into `~/.config/systemd/user/`, then `systemctl --user enable --now aubesonore-deploy.timer`. Requires user lingering (already on). Logs: `journalctl --user -u aubesonore-deploy`.

### Database backups

`scripts/backup-db.sh` runs nightly at 03:30 from `aubesonore-backup.timer` and writes a `pg_dump -Fc` archive to `/media/plex/.backups/aubesonore`, retained 14 days. That path is a **physically separate disk** (`sda1`) from the NVMe holding the Docker volume — a single-disk failure must not take both.

- The script refuses to dump unless the container reports `healthy`, and deletes any archive `pg_restore --list` cannot read: a corrupt dump is worse than none, because it looks like a backup.
- Dumps are `chmod 600` in a `700` directory — they carry user emails and auth rows, on a box shared with other services.
- To restore: `docker exec -i aubesonore-db pg_restore -U aubesonore -d <db> < <dump>`. Rehearse into a throwaway database, never straight over production.

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
- Don't re-add `.github/dependabot.yml` version updates — Renovate owns dependency PRs now (Dependabot = security alerts only). See _Dependency automation_.
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

## Dependency automation (Renovate)

Dependency PRs are managed by **Renovate** (runs as a GitHub App; config in `renovate.json`), not by Dependabot. Dependabot is kept for **security alerts only** — the hybrid pattern. `renovate.json` is the source of truth for the policy; change it there, not here.

- **Auto-merged once CI is green**: `devDependencies` minor/patch, stable (`>=1.0`) runtime **patches**, and GitHub Actions minor/patch.
- **Manual review always**: every **major** and Docker base images.
- Updates are grouped, scheduled weekly (Monday), and held by `minimumReleaseAge: 3 days` (supply-chain guard). Security updates ignore the delay.
- Renovate maintains a **Dependency Dashboard** issue listing everything pending — use it to trigger or rebase updates.
- Auto-merge is safe only because of the branch protection on `master` (the 3 required checks above). Repo settings `allow_auto_merge` + `delete_branch_on_merge` are on, so merged branches self-delete.

## Scaling roadmap

Five tiers, each with concrete listener-count triggers. Each tier's actions are deferred until the previous tier's trigger fires — no over-engineering.

| Tier               | Listeners pic | Stream bandwidth | Action                                                                                                                                                                      | Trigger                                  |
| ------------------ | ------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **P0 Now**         | < 10          | < 2 Mbps         | Nothing. Static JSON polling + nginx static = trivially capable.                                                                                                            | —                                        |
| **P1 Growth**      | 50–200        | 6–25 Mbps        | Add `/health` + Pool stats endpoint, basic alerting (CPU/RAM/disk). Verify automatic DB backup is running.                                                                  | Listener pic > 100 sustained one week    |
| **P2 Takeoff**     | 200–1000      | 25–128 Mbps      | Cloudflare in front of `radio.aubesonore.fr` with **Page Rule bypassing `/listen/*`** (ToS-safe — CF Free disallows disproportionate audio CDN use). Upgrade VPS if needed. | Listener pic > 500 sustained one month   |
| **P3 Established** | 1 000–5 000   | 128–640 Mbps     | Dedicated audio CDN (Bunny Stream / Icecast relay). Migrate in-memory caches to Redis (see below).                                                                          | Listener pic > 2 000 sustained one month |
| **P4 Hit**         | 5 000+        | > 640 Mbps       | Multi-region, DB read replica, auto-scaling.                                                                                                                                | Listener pic > 10 000                    |

### Redis migration triggers (in-memory state goes here)

When **any** of these fires, migrate everything below in one PR:

- Backend deployed across 2+ replicas (horizontal scaling)
- Sustained CPU > 70% on the single replica
- Cache hit ratio measurable < 50% for > 24h (means restarts are too frequent)

**State to migrate** (each implements `CacheStore<V>` from `lib/cache/ttlCache.ts` already):

- `songlinkCache` + `itunesCache` (`services/songlinkService.ts`)
- `lastfmCache` + `circuitOpenUntil` (`services/lastfmService.ts`)
- `lastRefreshByUser` Map (`services/trackService.ts`) — also persist to PG `user.last_refresh_at` column
- Rate limit buckets (`lib/rateLimit.ts`)

The `CacheStore<V>` interface exposes only sync `get/set/delete` to keep call sites unchanged. The Redis impl will sit behind a sync facade backed by an in-memory mirror — async writes to Redis happen in the background. Document the data loss window (typically < 1s) when migrating.

### What stays in-memory forever

- Per-request derived state (`auth.api.getSession()` already cached via Better Auth `cookieCache`).
- Background task registry (`lib/backgroundTasks.ts`) — per-replica by nature, drained on `SIGTERM`.
