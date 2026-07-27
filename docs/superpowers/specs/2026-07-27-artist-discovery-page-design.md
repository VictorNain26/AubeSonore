# Artist Discovery Page — Design Spec

**Date:** 2026-07-27
**Status:** Approved for planning
**Author:** Victor + Claude

## Goal

Turn AubeSonore from a single-screen player into a place for **music discovery**. Give every artist heard on the antenna a dynamically-generated, shareable page: bio, photo, similar artists, the tracks the radio has played by them, and outward links to streaming platforms. The experience must work for **emerging/long-tail artists**, hold up under **multi-listener load**, and be **performant, secure, and maintainable**.

The radio stays the curator (A+B: rich history + social signal already live in the Trends board). This spec adds the discovery layer (C): a per-artist page reachable by URL, with a persistent mini-player so the stream never stops while browsing.

## Scope

**In scope**

- A routed artist page at `/artist/:id` (React Router v7, declarative mode).
- A persistent compact mini-player shown on every route except `/`.
- Backend enrichment cascade: Deezer + Last.fm + MusicBrainz, aggregated behind one endpoint.
- Canonical artist identity resolution (messy AzuraCast string → stable id), persisted in a small `artist` table.
- Server-side Open Graph / Twitter Card injection so shared artist links preview correctly.
- Graceful degradation for artists with little or no external data.

**Out of scope** (separate goals, not deferred versions of this one)

- "Most-liked artists" leaderboard / per-artist like aggregation.
- User profiles, following, comments, chat.
- Replacing the existing liked-tracks artwork proxy work.

## Non-negotiables

Performance, security, and maintainability are first-class acceptance criteria, detailed in their own sections below. A change that regresses any of them is not done.

---

## Architecture

### Routing and the audio singleton

- Add `react-router` v7 in **declarative/library mode**: `<BrowserRouter>` wraps the app shell, `<Routes>`/`<Route>` select the view, `useParams`/`<Link>` for navigation. No framework mode, no loaders. Confirmed React 19-compatible ([react-router declarative routing docs](https://github.com/remix-run/react-router/blob/main/docs/start/declarative/routing.md), v7.9.4). In v7 the package is `react-router` (the `react-router-dom` split is gone).
- The `<audio>` element lives in `lib/player.ts` as a module singleton, and `NowPlayingPoller` sits in `App.tsx` **above** the router. A route change is therefore purely presentational — **the stream cannot be interrupted by navigation.**
- Routes:
  - `/` → `HomePage` (full `Player`, unchanged).
  - `/artist/:id` → `ArtistPage` + persistent `MiniPlayer`.
- `ArtistPage` is **lazy-loaded** (route-level code splitting) so it never bloats the main player bundle.

### Mini-player

A compact bottom bar (artwork, title/artist, play/pause, volume) that is a **second presentational view of the existing player state** (`nowPlayingStore` + `lib/player.ts` controls). Zero new audio logic. Rendered by the shell on any route ≠ `/`. It coordinates with the existing `bannerSlotStore` so it never fights the PWA banner for the bottom slot.

### Canonical identity

The route param is a **resolved canonical id**, never a raw name — this fixes accents, homonyms (two artists named "Kids"), and collaborations. URL shape: `/artist/:id` with an optional trailing slug for readability (`/artist/27/daft-punk`); only `:id` is authoritative.

---

## Backend

### Services

Three services, each isolated, single-responsibility, built on the existing `TtlCache` (`CacheStore<V>`) + circuit-breaker pattern already used by `lastfmService`/`songlinkService`. Each adds **single-flight** (in-flight request coalescing) so a cold popular-artist page opened by many listeners at once triggers **one** upstream fetch, not one per listener.

| Service              | Status | Upstream                                                                                      | Returns                                                                            | TTL / limits                                     |
| -------------------- | ------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| `lastfmService`      | exists | Last.fm `artist.getinfo` (`lang=fr`)                                                          | bio FR, tags, listeners                                                            | 24h / circuit breaker on 429                     |
| `deezerService`      | new    | Deezer `/search/artist`, `/artist/{id}`, `/artist/{id}/related`, `/artist/{id}/top` (keyless) | `picture_xl`, related artists **with images**, top tracks                          | 24h / circuit breaker on 429 + single-flight     |
| `musicbrainzService` | new    | MusicBrainz `/ws/2/artist/{mbid}?inc=url-rels&fmt=json`                                       | external links: Wikipedia, official site, Bandcamp/SoundCloud (long-tail/emerging) | 7d / **1 req/s throttle**, explicit `User-Agent` |

Deezer field/endpoint basis: [Deezer artist API mirror](https://github.com/antoineraulin/deezer-api/wiki/artist) + [deezer-python](https://deezer-python.readthedocs.io/en/stable/api_reference/resources/artist.html). Spotify related-artists is **not used** — [deprecated for new apps 2024-11-27](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api).

### Identity resolution

`resolveArtist(rawName) → canonicalId`:

1. **Normalize** the AzuraCast string deterministically (trim, case-fold, strip featured/collab suffixes — `feat.`, `ft.`, `&`, `x`, `vs` → keep primary artist).
2. **Look up** the `artist` table by normalized name. Hit → return stored id (no upstream call).
3. **Miss** → Deezer `/search/artist`, accept the top match **only above a confidence threshold** (exact/normalized name equality preferred). Optionally cross-reference MBID. Persist the resolution.
4. **Unresolved** (below threshold / no match) → return a sentinel. The page still renders from the guaranteed floor (radio history + platform search links); no external sections shown.

Resolution is persisted, not just cached in memory, so ids stay **stable across restarts** and a restart storm doesn't re-hammer Deezer with fuzzy searches (a source of id drift).

### Data model (Drizzle, `db/schema.ts`)

New `artist` table — identity only, **not** the social leaderboard:

- `id` (internal PK)
- `deezer_id` (nullable, unique), `mbid` (nullable, unique)
- `slug` (unique, for URL decoration)
- `normalized_name` (unique, indexed — the resolution key)
- `display_name`
- `first_seen_at`

Indexes inline in `schema.ts` per project convention. `bun db:push` to sync.

### Aggregate endpoint

`GET /api/artist/:id` → composes the three services into one `ArtistProfile` (see shared types). Server-side the three upstream calls run **in parallel**, each with an independent per-source timeout, so one slow/failed source returns a **partial** profile rather than blocking the whole response. Validated at the boundary (Valibot): `:id` must match the expected id shape before any use. Rate-limited like the existing artist route (10 req/60s per IP).

A companion resolve path maps a now-playing/liked raw name to its canonical id (used by the player's "open artist page" action and by the like flow to warm the cache).

### Shared types (`packages/shared-types`)

Replace the thin `ArtistInfo` with a richer `ArtistProfile` contract consumed by backend + frontend:

```
ArtistProfile {
  id: string
  name: string
  image: string | null          // absolute https Deezer URL, hotlinked
  bio: string | null            // Last.fm FR
  tags: string[]
  listeners: number | null
  similar: { id: string; name: string; image: string | null }[]
  topTracks: { title: string; ... }[]
  links: { platform: string; url: string }[]   // Bandcamp/SoundCloud/official/Wikipedia
  playedOnRadio: { ...radio history entries... }[]   // the guaranteed floor
  resolved: boolean
}
```

### Open Graph / share previews

Client-rendered React 19 metadata is **invisible to social scrapers** (they don't run JS — [React 19 blog](https://react.dev/blog/2024/12/05/react-19), [Facebook crawler](https://developers.facebook.com/docs/sharing/webmasters/crawler/)). So OG is injected **server-side**:

This is only possible because the frontend now runs on the same host as the backend, inside the same compose project (see `chore(infra): serve the frontend from the self-hosted stack`). While the SPA was on Vercel, the backend had no access to the built `index.html` and no way to serve the document — the reason this section previously described an unimplementable design.

- **nginx** proxies `/artist/*` **document** requests to the backend over the compose network; hashed JS/CSS/image assets keep being served straight from static.
- The backend **fetches `index.html` from the frontend container over HTTP** (`http://frontend/`) rather than mounting a shared volume — a volume would go stale on rebuild, an HTTP fetch always reflects the deployed build. Cached in `ttlCache`.
- It rewrites `<head>` with **Bun's native `HTMLRewriter`** (no dependency, encodes attribute values safely — safer than string-replace): `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, and the `twitter:card=summary_large_image` pair.
- `og:image` is the **absolute https** Deezer URL, validated against a host allowlist before injection (see Security).
- Rendered HTML cached per artist in `ttlCache` so repeated scrapes are cheap.
- One canonical URL for humans and crawlers. Not prerendering (routes are unbounded), not UA-split dynamic rendering (Google-deprecated) — the same OG-injected HTML is served to everyone; the body still hydrates client-side, so there is no UX cost. Basis: [Google dynamic-rendering deprecation](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering).
- The existing `/t` track-share route (`share.routes.ts` + `services/templates/sharePage.ts`) stays as it is. Its `escapeHtml` helper and its test shape — asserting on rendered `<meta>` content, including an XSS case — are the model for the artist OG tests.

React 19 in-app `<title>`/`<meta>` is kept for the browser tab and Googlebot — complementary, not a substitute.

---

## Frontend

New UI under the atomic design system (`src/design/{atoms,molecules,organisms}`), tokens only, Storybook story per component × both themes, addon-a11y clean, `check-contrast.mjs` green, 44px touch targets, focus-visible/hover/active/disabled states, motion under `prefers-reduced-motion` only.

- **`ArtistPage`** (organism/template) laying out:
  1. **Hero** — Deezer image → `CoverGlyph` fallback; name; tags; listeners.
  2. **Bio** — Last.fm FR with read-more.
  3. **Played on AubeSonore** — the guaranteed floor (radio history/stats), each row with like + share.
  4. **Similar artists** — Deezer cards with images, each a `<Link to="/artist/:id">` for chained discovery.
  5. **Listen / share** — platform links (existing Songlink) + share-this-page.
- **`ArtistCard`** (molecule) — the similar-artist card (image + name), reused in the hero rail.
- Store-coupled pieces ship a **presentational unit** (Storybook truth) + thin store container, per the frontend Storybook standard.
- Frontend keeps its existing `LruCache` layer over the endpoint.

### Degradation cascade (per-section, independent)

- No image → `CoverGlyph`.
- No bio / no similar → **hide** the section (no empty placeholder).
- Unresolved artist → hide all external sections.
- **Always present:** "Played on AubeSonore" + platform links. Even an artist the world doesn't know gets a real page, because the radio is the source that presents them — directly serving emerging artists.

---

## Performance

- **Shared global cache.** All listeners hear the same now-playing artist → one resolution + one metadata fetch serves everyone. Cache is global, never per-user.
- **Single-flight** on every service prevents cache-stampede on cold popular pages.
- **Parallel upstream + per-source timeout** → fast, partial-tolerant responses.
- **Hotlinked images** (Deezer CDN) — no byte storage, no proxy hop.
- **Route-level code splitting** for `ArtistPage`; the home player bundle is unchanged.
- **DB indexes** on `normalized_name`/`deezer_id`/`mbid`; resolution is a single indexed lookup on the hot path.
- Caches implement the existing `CacheStore<V>` interface → Redis-swappable per the scaling roadmap when horizontal scaling triggers fire.

## Security

- **SSRF:** upstream hosts (Deezer, Last.fm, MusicBrainz) are **fixed constants**, never user-supplied, so `assertSafeUrl` isn't on the API-call path — but every user-influenced value (artist name, `:id`) is **URL-encoded** before it enters a query string, and `:id` is **validated at the boundary** (Valibot: numeric Deezer id / UUID MBID shape) before any use.
- **OG injection / XSS:** artist name and image go into `<head>` via `HTMLRewriter.setAttribute`, which encodes attribute values (no raw string interpolation into HTML). The `og:image` URL is validated against an **https + Deezer-host allowlist** before injection, closing content-injection / open-graph-spoofing.
- **Rate limiting:** aggregate endpoint rate-limited per IP (10/60s), matching the existing artist route, to blunt enumeration/abuse.
- **Upstream etiquette:** MusicBrainz gets an explicit identifying `User-Agent` and 1 req/s throttle (their hard requirement); Deezer/Last.fm keep circuit breakers on 429.
- **Secrets:** Last.fm key stays server-side (env, never in a response); Deezer/MusicBrainz are keyless. No key ever reaches the client.
- **Cache integrity:** the resolution key is a deterministic normalization, so cache entries can't be steered by cosmetic input variants.
- **`securityHeaders` plugin stays mounted;** the OG-serving route returns HTML through the same header stack (CSP intact).

## Maintainability

- **Isolation:** each service does one thing, behind the shared `CacheStore<V>` interface — testable and replaceable in isolation; the aggregator is the only composition point.
- **One contract:** `ArtistProfile` in `shared-types` is the single source of truth backend ↔ frontend.
- **Conventions honored:** backend dotted filenames (`deezer.service.ts`, `artist.routes.ts`), frontend PascalCase components / camelCase lib+hooks, named exports, no comments except JSDoc on design-system prop interfaces.
- **Presentational/container split** keeps Storybook the UI source of truth and the components easy to reason about.
- **CLAUDE.md housekeeping** (part of this work): drop the stale "don't re-introduce react-router-dom" note (superseded by this decision), and update the artist section to describe the enrichment cascade + `artist` table.

## Testing (TDD)

Tests written **before** implementation, at the `fetch` boundary like the existing service tests / MSW handlers:

- **Services** — mocked `fetch`: cache hit/miss, TTL expiry, circuit-breaker open/close, single-flight coalescing, timeout → partial profile.
- **Resolution** — unit tests for normalization (case, accents, `feat.`/collab), confidence threshold, unresolved sentinel, restart stability.
- **Aggregate endpoint** — boundary validation (bad `:id` → 400), rate limit, partial-source composition.
- **OG route** — correct/escaped tags for a resolved artist; `og:image` host allowlist rejects a spoofed URL.
- **Frontend** — `ArtistPage`/`ArtistCard` presentational units via Storybook + tests, all degradation branches (no image, no bio, unresolved), both themes, a11y clean, `check-contrast.mjs` green.

Verification before "done": `pnpm typecheck && pnpm lint` (zero warnings), `pnpm test`, `pnpm --filter @aubesonore/backend test`, `node scripts/check-contrast.mjs`, and the 3 required CI checks green.

---

## Decisions locked / to tune during implementation

- **URL shape (locked):** decorated `/artist/:id/:slug` (e.g. `/artist/27/daft-punk`) for shareability; only `:id` is authoritative, `:slug` is cosmetic and ignored on resolve. A bare `/artist/:id` redirects to the decorated form.
- **To tune (implementation detail, not a spec ambiguity):** the Deezer-search confidence threshold — start strict (normalized-name equality) and loosen only if it misses real artists, backed by the resolution unit tests.
