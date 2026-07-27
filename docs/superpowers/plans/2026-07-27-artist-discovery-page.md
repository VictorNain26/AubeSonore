# Artist Discovery Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every artist heard on the antenna a shareable page at `/artist/:id/:slug` — bio, photo, similar artists, radio history, platform links — with a persistent mini-player so the stream never stops while browsing.

**Architecture:** Three isolated backend enrichment services (Deezer, Last.fm, MusicBrainz) sit behind shared `TtlCache` + circuit-breaker + single-flight, and are composed by one aggregator into an `ArtistProfile`. Artist identity is resolved once from the messy AzuraCast string and persisted in an `artist` table, so URLs are stable ids. The frontend gains react-router; the `<audio>` singleton stays above the router so navigation is purely presentational. nginx proxies `/artist/*` document requests to the backend, which injects Open Graph tags into the SPA shell.

**Tech Stack:** Bun 1.3 + Elysia 1.4, Drizzle 0.45 + PostgreSQL, Valibot; React 19.2 + Vite 8, Tailwind 4.3, Zustand 5, react-router 7, Vitest + bun test.

## Global Constraints

Every task's requirements implicitly include this section.

- **Prerequisite:** this plan sits on top of `chore(infra): serve the frontend from the self-hosted stack`. Task 7 (nginx proxy) is unimplementable without it.
- **Validation before any task is "done":** `pnpm typecheck` (0 errors), `pnpm lint` (0 warnings), `pnpm --filter=@aubesonore/frontend test --run`, `pnpm --filter=@aubesonore/backend test`, and for design tasks `node apps/frontend/scripts/check-contrast.mjs`.
- **CI is currently blocked by a GitHub Actions billing/quota failure** — jobs do not start. Local validation is the only safety net; commit locally and defer push/merge.
- **TDD:** write the failing test, run it, watch it fail for the right reason, then implement. No exceptions.
- **No comments** except JSDoc on design-system prop interfaces (feeds react-docgen-typescript) and a WHY comment where a constraint is non-obvious.
- **Named exports** everywhere. TypeScript strict. Backend files dotted (`deezer.service.ts` is wrong here — this repo uses `deezerService.ts`); frontend components PascalCase, lib/hooks camelCase.
- **Tokens only** in frontend: no raw hex/hsl/oklch outside `tokens.css`, no arbitrary Tailwind values (`p-[13px]`).
- **Every design-system component** gets a colocated Storybook story covering all states × both themes, addon-a11y clean, touch targets ≥ 44px, `hover`/`focus-visible`/`active`/`disabled` states, decorative motion only under `prefers-reduced-motion: no-preference`.
- **Never `fetch()` a user-supplied URL.** All upstream hosts are fixed constants. Every user-influenced value is `encodeURIComponent`-ed into query strings and validated at the HTTP boundary.
- **Never store or return `artwork_base64`.** Deezer images are hotlinked, never re-hosted.
- **Stage files explicitly** (`git add <file>`), never `git add .` / `-A`. Never `--no-verify`.

---

## File Structure

**Backend — new**

| File                                                 | Responsibility                                |
| ---------------------------------------------------- | --------------------------------------------- |
| `apps/backend/src/lib/singleFlight.ts`               | Coalesce concurrent identical async calls     |
| `apps/backend/src/services/deezerService.ts`         | Deezer search / artist / related / top-tracks |
| `apps/backend/src/services/musicbrainzService.ts`    | MusicBrainz external links, 1 req/s throttle  |
| `apps/backend/src/services/artistResolver.ts`        | Raw name → canonical persisted artist id      |
| `apps/backend/src/services/radioPlayService.ts`      | Record and query what the antenna played      |
| `apps/backend/src/services/artistProfileService.ts`  | Compose every source into `ArtistProfile`     |
| `apps/backend/src/services/templates/artistShell.ts` | Inject OG tags into the SPA shell             |
| `apps/backend/src/routes/artistPage.routes.ts`       | `GET /artist/*` document route                |
| `apps/backend/src/validators/artistValidator.ts`     | Valibot schema for `:id`                      |

**Backend — modified**

| File                                              | Change                                                   |
| ------------------------------------------------- | -------------------------------------------------------- |
| `apps/backend/src/db/schema.ts`                   | Add `artist` and `radio_play` tables + indexes           |
| `apps/backend/src/services/likedArtistWatcher.ts` | Record each new track as a radio play                    |
| `apps/backend/src/routes/artist.routes.ts`        | Add `GET /api/artist/:id` and `GET /api/artist/resolve`  |
| `apps/backend/src/index.ts`                       | Mount new route, start/dispose new caches                |
| `apps/backend/src/config/env.ts`                  | Add `MUSICBRAINZ_USER_AGENT`, `FRONTEND_ORIGIN_INTERNAL` |

**Shared**

| File                                  | Change                                    |
| ------------------------------------- | ----------------------------------------- |
| `packages/shared-types/src/client.ts` | Replace `ArtistInfo` with `ArtistProfile` |

**Frontend — new**

| File                                                                                | Responsibility                       |
| ----------------------------------------------------------------------------------- | ------------------------------------ |
| `apps/frontend/src/design/molecules/ArtistCard.tsx` (+ `.stories.tsx`, `.test.tsx`) | Similar-artist card                  |
| `apps/frontend/src/design/organisms/ArtistPageView.tsx` (+ `.stories.tsx`)          | Presentational artist page           |
| `apps/frontend/src/design/organisms/MiniPlayer.tsx` (+ `.stories.tsx`)              | Compact player bar                   |
| `apps/frontend/src/pages/ArtistPage.tsx`                                            | Store container for `ArtistPageView` |
| `apps/frontend/src/components/MiniPlayerContainer.tsx`                              | Store container for `MiniPlayer`     |
| `apps/frontend/src/lib/artistProfile.ts`                                            | Client fetch + LRU cache             |

**Frontend — modified**

| File                                  | Change                                         |
| ------------------------------------- | ---------------------------------------------- |
| `apps/frontend/src/App.tsx`           | `BrowserRouter` + `Routes`, poller stays above |
| `apps/frontend/src/main.tsx`          | unchanged (router lives in App)                |
| `apps/frontend/nginx.conf`            | Proxy `/artist/*` documents to backend         |
| `apps/frontend/src/lib/artistInfo.ts` | Superseded — deleted in Task 11                |

---

## Task 1: Single-flight helper

**Files:**

- Create: `apps/backend/src/lib/singleFlight.ts`
- Test: `apps/backend/src/lib/singleFlight.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `createSingleFlight<V>(): (key: string, fn: () => Promise<V>) => Promise<V>` — each call site gets its own isolated in-flight map.

- [ ] **Step 1: Write the failing test**

```ts
// apps/backend/src/lib/singleFlight.test.ts
import { describe, it, expect } from 'bun:test';
import { createSingleFlight } from './singleFlight';

describe('createSingleFlight', () => {
  it('runs the worker once for concurrent calls sharing a key', async () => {
    const flight = createSingleFlight<string>();
    let calls = 0;
    const work = async (): Promise<string> => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'value';
    };

    const results = await Promise.all([flight('k', work), flight('k', work), flight('k', work)]);

    expect(results).toEqual(['value', 'value', 'value']);
    expect(calls).toBe(1);
  });

  it('runs the worker again once the first call settled', async () => {
    const flight = createSingleFlight<number>();
    let calls = 0;
    const work = (): Promise<number> => Promise.resolve(++calls);

    await flight('k', work);
    await flight('k', work);

    expect(calls).toBe(2);
  });

  it('keeps distinct keys independent', async () => {
    const flight = createSingleFlight<string>();
    const results = await Promise.all([
      flight('a', () => Promise.resolve('a')),
      flight('b', () => Promise.resolve('b')),
    ]);

    expect(results).toEqual(['a', 'b']);
  });

  it('propagates rejection to every caller and clears the slot', async () => {
    const flight = createSingleFlight<string>();
    let calls = 0;
    const boom = (): Promise<string> => {
      calls++;
      return Promise.reject(new Error('upstream down'));
    };

    const first = flight('k', boom);
    const second = flight('k', boom);

    await expect(first).rejects.toThrow('upstream down');
    await expect(second).rejects.toThrow('upstream down');
    expect(calls).toBe(1);

    await expect(flight('k', boom)).rejects.toThrow('upstream down');
    expect(calls).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@aubesonore/backend test singleFlight`
Expected: FAIL — `Cannot find module './singleFlight'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/backend/src/lib/singleFlight.ts

/**
 * Coalesces concurrent calls sharing a key onto a single in-flight promise.
 * Each call site builds its own instance so keys from different services
 * cannot collide.
 */
export function createSingleFlight<V>(): (key: string, fn: () => Promise<V>) => Promise<V> {
  const inFlight = new Map<string, Promise<V>>();

  return (key, fn) => {
    const existing = inFlight.get(key);
    if (existing) return existing;

    const promise = fn().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, promise);
    return promise;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@aubesonore/backend test singleFlight`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/lib/singleFlight.ts apps/backend/src/lib/singleFlight.test.ts
git commit apps/backend/src/lib/singleFlight.ts apps/backend/src/lib/singleFlight.test.ts -m "feat(backend): add single-flight helper to coalesce concurrent upstream calls"
```

---

## Task 2: Deezer service

Deezer is keyless and covers the distributed long tail, which is what makes emerging artists work. Endpoints per [deezer-python resource reference](https://deezer-python.readthedocs.io/en/stable/api_reference/resources/artist.html). Spotify's related-artists is deliberately unused — [deprecated for new apps 2024-11-27](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api).

**Files:**

- Create: `apps/backend/src/services/deezerService.ts`
- Test: `apps/backend/src/services/deezerService.test.ts`

**Interfaces:**

- Consumes: `createSingleFlight` (Task 1), `TtlCache` from `../lib/cache/ttlCache`, `similarity` from `../lib/text/matchScore`, `logger`.
- Produces:
  - `interface DeezerArtist { id: string; name: string; picture: string | null }`
  - `interface DeezerTrack { title: string; link: string }`
  - `searchArtist(name: string): Promise<DeezerArtist | null>`
  - `getArtist(id: string): Promise<DeezerArtist | null>`
  - `getRelatedArtists(id: string): Promise<DeezerArtist[]>`
  - `getTopTracks(id: string): Promise<DeezerTrack[]>`
  - `deezerCache: TtlCache<unknown>`

- [ ] **Step 1: Write the failing test**

```ts
// apps/backend/src/services/deezerService.test.ts
import { describe, it, expect, spyOn, afterEach } from 'bun:test';

const { searchArtist, getRelatedArtists, deezerCache } = await import('./deezerService');

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore?.();
  deezerCache.dispose();
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('searchArtist', () => {
  it('returns the top match when the name matches closely', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({ data: [{ id: 27, name: 'Daft Punk', picture_xl: 'https://cdn.deezer.com/dp.jpg' }] })
    );

    const result = await searchArtist('Daft Punk');

    expect(result).toEqual({
      id: '27',
      name: 'Daft Punk',
      picture: 'https://cdn.deezer.com/dp.jpg',
    });
  });

  it('rejects a top match whose name is unrelated to the query', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({ data: [{ id: 99, name: 'Completely Other Band', picture_xl: null }] })
    );

    const result = await searchArtist('Daft Punk');

    expect(result).toBeNull();
  });

  it('returns null and caches the miss on an empty result set', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [] }));

    expect(await searchArtist('No Such Artist Anywhere')).toBeNull();
    expect(await searchArtist('No Such Artist Anywhere')).toBeNull();
    expect(fetchSpy.mock.calls.length).toBe(1);
  });

  it('does not cache a 500 so the next call retries', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 })
    );

    expect(await searchArtist('Transient Failure Artist')).toBeNull();
    expect(await searchArtist('Transient Failure Artist')).toBeNull();
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
  });

  it('opens the circuit on 429 and stops calling upstream', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 429 })
    );

    expect(await searchArtist('Rate Limited One')).toBeNull();
    const callsAfterFirst = fetchSpy.mock.calls.length;
    expect(await searchArtist('Rate Limited Two')).toBeNull();

    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst);
  });

  it('coalesces concurrent identical lookups into one upstream call', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) =>
          setTimeout(() => resolve(json({ data: [{ id: 7, name: 'Air', picture_xl: null }] })), 20)
        )
    );

    const [a, b, c] = await Promise.all([
      searchArtist('Air'),
      searchArtist('Air'),
      searchArtist('Air'),
    ]);

    expect(a).toEqual(b);
    expect(b).toEqual(c);
    expect(fetchSpy.mock.calls.length).toBe(1);
  });
});

describe('getRelatedArtists', () => {
  it('maps related artists and keeps their pictures', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({
        data: [
          { id: 1, name: 'Justice', picture_xl: 'https://cdn.deezer.com/j.jpg' },
          { id: 2, name: 'Air', picture_xl: null },
        ],
      })
    );

    const result = await getRelatedArtists('27');

    expect(result).toEqual([
      { id: '1', name: 'Justice', picture: 'https://cdn.deezer.com/j.jpg' },
      { id: '2', name: 'Air', picture: null },
    ]);
  });

  it('returns an empty list when upstream fails', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 502 }));

    expect(await getRelatedArtists('27')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@aubesonore/backend test deezerService`
Expected: FAIL — `Cannot find module './deezerService'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/backend/src/services/deezerService.ts
import { TtlCache } from '../lib/cache/ttlCache';
import { createSingleFlight } from '../lib/singleFlight';
import { similarity } from '../lib/text/matchScore';
import { logger } from '../lib/logger';

export interface DeezerArtist {
  id: string;
  name: string;
  picture: string | null;
}

export interface DeezerTrack {
  title: string;
  link: string;
}

const DEEZER_API = 'https://api.deezer.com';
const POSITIVE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000;
const CIRCUIT_OPEN_MS = 60 * 1000;
const TIMEOUT_MS = 5_000;
// Below this, the top Deezer hit is a different artist that merely ranked
// first — binding it to the id would poison the persisted resolution.
const NAME_MATCH_THRESHOLD = 0.85;

export const deezerCache = new TtlCache<unknown>(POSITIVE_TTL_MS);
const flight = createSingleFlight<unknown>();
let circuitOpenUntil = 0;

interface RawArtist {
  id?: number;
  name?: string;
  picture_xl?: string | null;
}

function toArtist(raw: RawArtist): DeezerArtist | null {
  if (typeof raw.id !== 'number' || typeof raw.name !== 'string') return null;
  return { id: String(raw.id), name: raw.name, picture: raw.picture_xl ?? null };
}

async function getJson<T>(path: string): Promise<T | null> {
  if (Date.now() < circuitOpenUntil) return null;

  let response: Response;
  try {
    response = await fetch(`${DEEZER_API}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    logger.warn('deezer.network_error', { path, message: (err as Error).message });
    return null;
  }

  if (response.status === 429) {
    circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
    logger.warn('deezer.circuit_open', { durationMs: CIRCUIT_OPEN_MS });
    return null;
  }
  if (!response.ok) {
    logger.warn('deezer.upstream_error', { path, status: response.status });
    return null;
  }

  return (await response.json()) as T;
}

export async function searchArtist(name: string): Promise<DeezerArtist | null> {
  const key = `search:${name.toLowerCase()}`;
  const cached = deezerCache.get(key);
  if (cached !== undefined) return cached as DeezerArtist | null;

  return (await flight(key, async () => {
    const payload = await getJson<{ data?: RawArtist[] }>(
      `/search/artist?limit=1&q=${encodeURIComponent(name)}`
    );
    if (!payload) return null;

    const candidate = payload.data?.[0] ? toArtist(payload.data[0]) : null;
    if (!candidate || similarity(name, candidate.name) < NAME_MATCH_THRESHOLD) {
      deezerCache.set(key, null, NEGATIVE_TTL_MS);
      return null;
    }

    deezerCache.set(key, candidate);
    return candidate;
  })) as DeezerArtist | null;
}

export async function getArtist(id: string): Promise<DeezerArtist | null> {
  const key = `artist:${id}`;
  const cached = deezerCache.get(key);
  if (cached !== undefined) return cached as DeezerArtist | null;

  return (await flight(key, async () => {
    const payload = await getJson<RawArtist>(`/artist/${encodeURIComponent(id)}`);
    const artist = payload ? toArtist(payload) : null;
    if (!payload) return null;
    deezerCache.set(key, artist, artist ? undefined : NEGATIVE_TTL_MS);
    return artist;
  })) as DeezerArtist | null;
}

export async function getRelatedArtists(id: string): Promise<DeezerArtist[]> {
  const key = `related:${id}`;
  const cached = deezerCache.get(key);
  if (cached !== undefined) return cached as DeezerArtist[];

  return (await flight(key, async () => {
    const payload = await getJson<{ data?: RawArtist[] }>(
      `/artist/${encodeURIComponent(id)}/related?limit=8`
    );
    if (!payload) return [];

    const related = (payload.data ?? [])
      .map(toArtist)
      .filter((entry): entry is DeezerArtist => entry !== null);
    deezerCache.set(key, related);
    return related;
  })) as DeezerArtist[];
}

export async function getTopTracks(id: string): Promise<DeezerTrack[]> {
  const key = `top:${id}`;
  const cached = deezerCache.get(key);
  if (cached !== undefined) return cached as DeezerTrack[];

  return (await flight(key, async () => {
    const payload = await getJson<{ data?: Array<{ title?: string; link?: string }> }>(
      `/artist/${encodeURIComponent(id)}/top?limit=5`
    );
    if (!payload) return [];

    const tracks = (payload.data ?? [])
      .filter(
        (raw): raw is { title: string; link: string } =>
          typeof raw.title === 'string' && typeof raw.link === 'string'
      )
      .map((raw) => ({ title: raw.title, link: raw.link }));
    deezerCache.set(key, tracks);
    return tracks;
  })) as DeezerTrack[];
}

export function __resetDeezerCircuit(): void {
  circuitOpenUntil = 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@aubesonore/backend test deezerService`
Expected: PASS — 8 tests

Note: the circuit-breaker test leaves the breaker open for other tests in the same file. Add `__resetDeezerCircuit()` to the `afterEach` if ordering issues appear.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/deezerService.ts apps/backend/src/services/deezerService.test.ts
git commit apps/backend/src/services/deezerService.ts apps/backend/src/services/deezerService.test.ts -m "feat(backend): add Deezer artist service with cache, breaker and single-flight"
```

---

## Task 3: MusicBrainz service

MusicBrainz supplies the Bandcamp / SoundCloud / official-site links that make a page useful for an artist nobody has written a bio about. Their rate limit is **1 request/second** and a descriptive `User-Agent` is mandatory — see [MusicBrainz API rate limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting).

**Files:**

- Create: `apps/backend/src/services/musicbrainzService.ts`
- Test: `apps/backend/src/services/musicbrainzService.test.ts`
- Modify: `apps/backend/src/config/env.ts`

**Interfaces:**

- Consumes: `TtlCache`, `createSingleFlight`, `env`, `logger`.
- Produces:
  - `interface ExternalLink { platform: string; url: string }`
  - `getArtistLinks(mbid: string): Promise<ExternalLink[]>`
  - `musicbrainzCache: TtlCache<ExternalLink[]>`

- [ ] **Step 1: Add the env var**

In `apps/backend/src/config/env.ts`, add to the `Env` interface and the exported object:

```ts
MUSICBRAINZ_USER_AGENT: string;
```

```ts
  MUSICBRAINZ_USER_AGENT:
    Bun.env.MUSICBRAINZ_USER_AGENT ?? 'AubeSonore/1.0 (https://aubesonore.fr)',
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/backend/src/services/musicbrainzService.test.ts
import { describe, it, expect, spyOn, afterEach } from 'bun:test';

const { getArtistLinks, musicbrainzCache } = await import('./musicbrainzService');

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore?.();
  musicbrainzCache.dispose();
});

function relationsResponse(relations: unknown[]): Response {
  return new Response(JSON.stringify({ relations }), {
    headers: { 'content-type': 'application/json' },
  });
}

describe('getArtistLinks', () => {
  it('maps known relation types to platform links', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      relationsResponse([
        { type: 'official homepage', url: { resource: 'https://artist.example' } },
        { type: 'bandcamp', url: { resource: 'https://artist.bandcamp.com' } },
        { type: 'soundcloud', url: { resource: 'https://soundcloud.com/artist' } },
        { type: 'wikipedia', url: { resource: 'https://fr.wikipedia.org/wiki/Artist' } },
      ])
    );

    const links = await getArtistLinks('11111111-1111-1111-1111-111111111111');

    expect(links).toEqual([
      { platform: 'official', url: 'https://artist.example' },
      { platform: 'bandcamp', url: 'https://artist.bandcamp.com' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/artist' },
      { platform: 'wikipedia', url: 'https://fr.wikipedia.org/wiki/Artist' },
    ]);
  });

  it('drops relation types it does not map and non-https urls', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      relationsResponse([
        { type: 'discogs', url: { resource: 'https://discogs.com/artist' } },
        { type: 'bandcamp', url: { resource: 'http://insecure.bandcamp.com' } },
      ])
    );

    expect(await getArtistLinks('22222222-2222-2222-2222-222222222222')).toEqual([]);
  });

  it('sends an identifying User-Agent', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(relationsResponse([]));

    await getArtistLinks('33333333-3333-3333-3333-333333333333');

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('user-agent')).toContain('AubeSonore');
  });

  it('caches the result so a second call skips upstream', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(relationsResponse([]));
    const mbid = '44444444-4444-4444-4444-444444444444';

    await getArtistLinks(mbid);
    await getArtistLinks(mbid);

    expect(fetchSpy.mock.calls.length).toBe(1);
  });

  it('returns an empty list when upstream fails', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 503 }));

    expect(await getArtistLinks('55555555-5555-5555-5555-555555555555')).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter=@aubesonore/backend test musicbrainzService`
Expected: FAIL — `Cannot find module './musicbrainzService'`

- [ ] **Step 4: Write the implementation**

```ts
// apps/backend/src/services/musicbrainzService.ts
import { env } from '../config/env';
import { TtlCache } from '../lib/cache/ttlCache';
import { createSingleFlight } from '../lib/singleFlight';
import { logger } from '../lib/logger';

export interface ExternalLink {
  platform: string;
  url: string;
}

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 5_000;
// MusicBrainz caps anonymous clients at one request per second and will ban
// callers that ignore it. https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
const MIN_INTERVAL_MS = 1_000;

const RELATION_TO_PLATFORM: Record<string, string> = {
  'official homepage': 'official',
  bandcamp: 'bandcamp',
  soundcloud: 'soundcloud',
  wikipedia: 'wikipedia',
};

export const musicbrainzCache = new TtlCache<ExternalLink[]>(TTL_MS);
const flight = createSingleFlight<ExternalLink[]>();
let nextSlotAt = 0;

async function waitForSlot(): Promise<void> {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextSlotAt);
  nextSlotAt = scheduledAt + MIN_INTERVAL_MS;
  const delay = scheduledAt - now;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function getArtistLinks(mbid: string): Promise<ExternalLink[]> {
  const cached = musicbrainzCache.get(mbid);
  if (cached !== undefined) return cached;

  return flight(mbid, async () => {
    await waitForSlot();

    let response: Response;
    try {
      response = await fetch(
        `${MUSICBRAINZ_API}/artist/${encodeURIComponent(mbid)}?inc=url-rels&fmt=json`,
        {
          headers: { 'User-Agent': env.MUSICBRAINZ_USER_AGENT },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }
      );
    } catch (err) {
      logger.warn('musicbrainz.network_error', { mbid, message: (err as Error).message });
      return [];
    }

    if (!response.ok) {
      logger.warn('musicbrainz.upstream_error', { mbid, status: response.status });
      return [];
    }

    const payload = (await response.json()) as {
      relations?: Array<{ type?: string; url?: { resource?: string } }>;
    };

    const links = (payload.relations ?? []).flatMap((relation) => {
      const platform = RELATION_TO_PLATFORM[relation.type ?? ''];
      const url = relation.url?.resource;
      if (!platform || !url?.startsWith('https://')) return [];
      return [{ platform, url }];
    });

    musicbrainzCache.set(mbid, links);
    return links;
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter=@aubesonore/backend test musicbrainzService`
Expected: PASS — 5 tests

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/services/musicbrainzService.ts apps/backend/src/services/musicbrainzService.test.ts apps/backend/src/config/env.ts
git commit apps/backend/src/services/musicbrainzService.ts apps/backend/src/services/musicbrainzService.test.ts apps/backend/src/config/env.ts -m "feat(backend): add MusicBrainz external-links service with 1 rps throttle"
```

---

## Task 4: Artist table and identity resolution

Turning `"Justice feat. Uffie"` into a stable id is the piece that makes URLs shareable. Splitting is deliberately conservative: only explicit featuring markers are stripped. **Do not split on `&`, `x` or `,`** — that would destroy "Simon & Garfunkel", "Florence + The Machine" and every legitimate multi-word name. Everything else is left to Deezer search plus the confidence threshold.

**Files:**

- Modify: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/src/services/artistResolver.ts`
- Test: `apps/backend/src/services/artistResolver.test.ts`

**Interfaces:**

- Consumes: `searchArtist` (Task 2), `normalize` from `../lib/text/matchScore`, `db` + `artist` table.
- Produces:
  - `primaryArtistName(raw: string): string`
  - `slugify(name: string): string`
  - `resolveArtist(rawName: string): Promise<{ id: string; slug: string } | null>`

- [ ] **Step 1: Add the table to `schema.ts`**

Append to `apps/backend/src/db/schema.ts`:

```ts
// ─────────────────────────────────────────────
// ARTIST TABLE — canonical identity only
// ─────────────────────────────────────────────
export const artist = pgTable(
  'artist',
  {
    id: text('id').primaryKey(),
    normalizedName: text('normalized_name').notNull(),
    displayName: text('display_name').notNull(),
    slug: text('slug').notNull(),
    deezerId: text('deezer_id'),
    mbid: text('mbid'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // The resolution hot path is a single lookup on this column.
    artistNormalizedNameUnique: uniqueIndex('artist_normalized_name_unique').on(
      table.normalizedName
    ),
    // Postgres allows repeated NULLs in a unique index, so unresolved rows
    // (no Deezer match) do not collide with each other.
    artistDeezerIdUnique: uniqueIndex('artist_deezer_id_unique').on(table.deezerId),
    artistMbidUnique: uniqueIndex('artist_mbid_unique').on(table.mbid),
  })
);

export type Artist = InferSelectModel<typeof artist>;
export type NewArtist = InferInsertModel<typeof artist>;
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/backend/src/services/artistResolver.test.ts
import { describe, it, expect } from 'bun:test';
import { primaryArtistName, slugify } from './artistResolver';

describe('primaryArtistName', () => {
  it('strips explicit featuring markers', () => {
    expect(primaryArtistName('Justice feat. Uffie')).toBe('Justice');
    expect(primaryArtistName('Justice ft. Uffie')).toBe('Justice');
    expect(primaryArtistName('Justice featuring Uffie')).toBe('Justice');
    expect(primaryArtistName('Justice FEAT Uffie')).toBe('Justice');
  });

  it('keeps ampersands, plus signs and commas that belong to the name', () => {
    expect(primaryArtistName('Simon & Garfunkel')).toBe('Simon & Garfunkel');
    expect(primaryArtistName('Florence + The Machine')).toBe('Florence + The Machine');
    expect(primaryArtistName('Earth, Wind & Fire')).toBe('Earth, Wind & Fire');
  });

  it('trims surrounding whitespace', () => {
    expect(primaryArtistName('  Air  ')).toBe('Air');
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Daft Punk')).toBe('daft-punk');
  });

  it('strips diacritics', () => {
    expect(slugify('Étienne Daho')).toBe('etienne-daho');
  });

  it('collapses punctuation and trims stray hyphens', () => {
    expect(slugify('Simon & Garfunkel!')).toBe('simon-garfunkel');
    expect(slugify('!!!')).toBe('');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter=@aubesonore/backend test artistResolver`
Expected: FAIL — `Cannot find module './artistResolver'`

- [ ] **Step 4: Write the implementation**

```ts
// apps/backend/src/services/artistResolver.ts
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { artist } from '../db/schema';
import { normalize } from '../lib/text/matchScore';
import { searchArtist } from './deezerService';

// Only explicit featuring markers. Splitting on `&`, `+`, `x` or `,` would
// destroy legitimate names ("Simon & Garfunkel", "Earth, Wind & Fire").
const FEATURING_SEPARATOR = /\s+(?:feat\.?|ft\.?|featuring)\s+/i;

export function primaryArtistName(raw: string): string {
  return (raw.split(FEATURING_SEPARATOR)[0] ?? raw).trim();
}

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function resolveArtist(rawName: string): Promise<{ id: string; slug: string } | null> {
  const primary = primaryArtistName(rawName);
  const normalizedName = normalize(primary);
  if (!normalizedName) return null;

  const existing = await db
    .select({ id: artist.id, slug: artist.slug })
    .from(artist)
    .where(eq(artist.normalizedName, normalizedName))
    .limit(1);
  if (existing[0]) return existing[0];

  const match = await searchArtist(primary);
  const displayName = match?.name ?? primary;

  const inserted = await db
    .insert(artist)
    .values({
      id: randomUUID(),
      normalizedName,
      displayName,
      slug: slugify(displayName),
      deezerId: match?.id ?? null,
      mbid: null,
    })
    .onConflictDoNothing()
    .returning({ id: artist.id, slug: artist.slug });
  if (inserted[0]) return inserted[0];

  // Lost the insert race against a concurrent resolution — read the winner.
  const winner = await db
    .select({ id: artist.id, slug: artist.slug })
    .from(artist)
    .where(eq(artist.normalizedName, normalizedName))
    .limit(1);
  return winner[0] ?? null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter=@aubesonore/backend test artistResolver`
Expected: PASS — 7 tests

- [ ] **Step 6: Sync the schema**

Run: `cd apps/backend && bun db:push`
Expected: the `artist` table and its three unique indexes are created.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/db/schema.ts apps/backend/src/services/artistResolver.ts apps/backend/src/services/artistResolver.test.ts
git commit apps/backend/src/db/schema.ts apps/backend/src/services/artistResolver.ts apps/backend/src/services/artistResolver.test.ts -m "feat(backend): persist canonical artist identity and resolve raw names"
```

---

## Task 4b: Radio play history — the guaranteed floor

This is the section that makes the page worth existing for an artist nobody has documented: whatever Deezer, Last.fm and MusicBrainz know, **the radio played them here**, and that is a fact only we hold.

There is no persisted play history today — `radioService.getStationHistory` fetches recent AzuraCast rows live (60s cache) and cannot be queried by artist. But `likedArtistWatcher` **already polls now-playing server-side and already detects track changes** via `sh_id`, so recording plays is a small addition to a component that exists and is tested, not a new subsystem.

**Files:**

- Modify: `apps/backend/src/db/schema.ts`, `apps/backend/src/services/likedArtistWatcher.ts`
- Create: `apps/backend/src/services/radioPlayService.ts`
- Test: `apps/backend/src/services/radioPlayService.test.ts`, extend `likedArtistWatcher.test.ts`

**Interfaces:**

- Consumes: `normalize` from `../lib/text/matchScore`, `db`.
- Produces:
  - `recordPlay(title: string, artist: string): Promise<void>`
  - `getPlaysByArtist(normalizedName: string, limit?: number): Promise<RadioPlay[]>`
  - `interface RadioPlay { title: string; artist: string; playedAt: string; playCount: number }`

- [ ] **Step 1: Add the table**

```ts
// ─────────────────────────────────────────────
// RADIO PLAY TABLE — what the antenna actually played
// ─────────────────────────────────────────────
export const radioPlay = pgTable(
  'radio_play',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    // Denormalised so the artist page joins without recomputing per row.
    artistNormalized: text('artist_normalized').notNull(),
    playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    radioPlayArtistPlayedAtIdx: index('radio_play_artist_played_at_idx').on(
      table.artistNormalized,
      table.playedAt
    ),
  })
);

export type RadioPlayRow = InferSelectModel<typeof radioPlay>;
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/backend/src/services/radioPlayService.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test';

interface Row {
  id: string;
  title: string;
  artist: string;
  artistNormalized: string;
  playedAt: Date;
}

let rows: Row[] = [];

mock.module('../db', () => ({
  db: {
    insert: () => ({
      values: (value: Row) => {
        rows.push(value);
        return Promise.resolve();
      },
    }),
  },
}));

const { buildPlayRow } = await import('./radioPlayService');

beforeEach(() => {
  rows = [];
});

describe('buildPlayRow', () => {
  it('normalises the artist for indexed lookup', () => {
    const row = buildPlayRow('Nosedive', 'Étienne Daho');

    expect(row.artist).toBe('Étienne Daho');
    expect(row.artistNormalized).toBe('etienne daho');
  });

  it('normalises a featuring credit to its primary artist', () => {
    const row = buildPlayRow('D.A.N.C.E.', 'Justice feat. Uffie');

    expect(row.artistNormalized).toBe('justice');
  });

  it('generates a distinct id per play', () => {
    expect(buildPlayRow('A', 'X').id).not.toBe(buildPlayRow('A', 'X').id);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter=@aubesonore/backend test radioPlayService`
Expected: FAIL — `Cannot find module './radioPlayService'`

- [ ] **Step 4: Write the implementation**

```ts
// apps/backend/src/services/radioPlayService.ts
import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '../db';
import { radioPlay } from '../db/schema';
import { normalize } from '../lib/text/matchScore';
import { primaryArtistName } from './artistResolver';

export interface RadioPlay {
  title: string;
  artist: string;
  playedAt: string;
}

const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

export function buildPlayRow(
  title: string,
  artist: string
): {
  id: string;
  title: string;
  artist: string;
  artistNormalized: string;
} {
  return {
    id: randomUUID(),
    title,
    artist,
    artistNormalized: normalize(primaryArtistName(artist)),
  };
}

export async function recordPlay(title: string, artist: string): Promise<void> {
  const row = buildPlayRow(title, artist);
  if (!row.artistNormalized) return;
  await db.insert(radioPlay).values(row);
}

export async function getPlaysByArtist(normalizedName: string, limit = 20): Promise<RadioPlay[]> {
  const since = new Date(Date.now() - RETENTION_MS);
  const rows = await db
    .select({ title: radioPlay.title, artist: radioPlay.artist, playedAt: radioPlay.playedAt })
    .from(radioPlay)
    .where(and(eq(radioPlay.artistNormalized, normalizedName), gte(radioPlay.playedAt, since)))
    .orderBy(desc(radioPlay.playedAt))
    .limit(limit);

  return rows.map((row) => ({
    title: row.title,
    artist: row.artist,
    playedAt: row.playedAt.toISOString(),
  }));
}
```

- [ ] **Step 5: Record plays from the existing watcher**

In `likedArtistWatcher.ts`, the block that already runs exactly once per new track is the insertion point:

```ts
if (!track || track.sh_id === lastShId) return;
lastShId = track.sh_id;

// Every new track is recorded, whether or not anyone gets notified —
// this is the artist page's guaranteed floor.
await deps.recordPlay(track.title, track.artist);
```

Add `recordPlay: (title: string, artist: string) => Promise<void>` to `WatcherDeps` and wire the real `recordPlay` in `startLikedArtistWatcher`. Extend `likedArtistWatcher.test.ts` with a case asserting `recordPlay` is called once per new `sh_id` and **not** called when `sh_id` is unchanged.

- [ ] **Step 6: Run tests and sync the schema**

```bash
pnpm --filter=@aubesonore/backend test radioPlayService
pnpm --filter=@aubesonore/backend test likedArtistWatcher
cd apps/backend && bun db:push
```

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/db/schema.ts apps/backend/src/services/radioPlayService.ts apps/backend/src/services/radioPlayService.test.ts apps/backend/src/services/likedArtistWatcher.ts apps/backend/src/services/likedArtistWatcher.test.ts
git commit apps/backend/src/db/schema.ts apps/backend/src/services/radioPlayService.ts apps/backend/src/services/radioPlayService.test.ts apps/backend/src/services/likedArtistWatcher.ts apps/backend/src/services/likedArtistWatcher.test.ts -m "feat(backend): record what the antenna plays for the artist page floor"
```

> **Note for whoever runs this:** rows only start accumulating once deployed, so the section is empty for every artist until the radio has played them at least once with this build live. That is expected, not a bug.

---

## Task 5: ArtistProfile type and aggregator

Sources run in parallel and are individually allowed to fail: one slow upstream must degrade a section, never the whole response.

**Files:**

- Modify: `packages/shared-types/src/client.ts`
- Create: `apps/backend/src/services/artistProfileService.ts`
- Test: `apps/backend/src/services/artistProfileService.test.ts`

**Interfaces:**

- Consumes: `getArtist`/`getRelatedArtists`/`getTopTracks` (Task 2), `getArtistLinks` (Task 3), `getArtistInfo` from `./lastfmService`, `artist` table.
- Produces: `getArtistProfile(id: string): Promise<ArtistProfile | null>`

- [ ] **Step 1: Replace `ArtistInfo` in shared types**

In `packages/shared-types/src/client.ts`, replace the `ArtistInfo` interface with:

```ts
export interface ArtistLink {
  platform: string;
  url: string;
}

export interface SimilarArtist {
  id: string;
  name: string;
  image: string | null;
}

export interface ArtistTopTrack {
  title: string;
  url: string;
}

export interface ArtistRadioPlay {
  title: string;
  artist: string;
  /** ISO timestamp of the play. */
  playedAt: string;
}

export interface ArtistProfile {
  id: string;
  name: string;
  slug: string;
  /** Absolute https Deezer URL, hotlinked — never re-hosted. */
  image: string | null;
  bio: string | null;
  tags: string[];
  listeners: number | null;
  similar: SimilarArtist[];
  topTracks: ArtistTopTrack[];
  links: ArtistLink[];
  /** What the antenna actually played — the one section no upstream can supply. */
  playedOnRadio: ArtistRadioPlay[];
  /** False when no upstream match was found; only the radio floor renders. */
  resolved: boolean;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/backend/src/services/artistProfileService.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test';

const artistRow = {
  id: 'artist-1',
  displayName: 'Daft Punk',
  slug: 'daft-punk',
  deezerId: '27',
  mbid: null as string | null,
};
let rows: Array<typeof artistRow> = [artistRow];

mock.module('../db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve(rows) }),
      }),
    }),
  },
}));

mock.module('./deezerService', () => ({
  getArtist: () =>
    Promise.resolve({ id: '27', name: 'Daft Punk', picture: 'https://cdn.deezer.com/dp.jpg' }),
  getRelatedArtists: () =>
    Promise.resolve([{ id: '1', name: 'Justice', picture: 'https://cdn.deezer.com/j.jpg' }]),
  getTopTracks: () =>
    Promise.resolve([{ title: 'Around the World', link: 'https://deezer.com/track/1' }]),
}));

mock.module('./lastfmService', () => ({
  getArtistInfo: () =>
    Promise.resolve({
      bio: 'Un duo français.',
      tags: ['french house'],
      similarArtists: [],
      listeners: 4200,
    }),
}));

mock.module('./musicbrainzService', () => ({
  getArtistLinks: () => Promise.resolve([{ platform: 'official', url: 'https://daftpunk.com' }]),
}));

mock.module('./radioPlayService', () => ({
  getPlaysByArtist: () =>
    Promise.resolve([
      { title: 'Around the World', artist: 'Daft Punk', playedAt: '2026-07-27T10:00:00.000Z' },
    ]),
}));

const { getArtistProfile } = await import('./artistProfileService');

beforeEach(() => {
  rows = [artistRow];
});

describe('getArtistProfile', () => {
  it('composes every source into one profile', async () => {
    const profile = await getArtistProfile('artist-1');

    expect(profile).not.toBeNull();
    expect(profile?.name).toBe('Daft Punk');
    expect(profile?.slug).toBe('daft-punk');
    expect(profile?.image).toBe('https://cdn.deezer.com/dp.jpg');
    expect(profile?.bio).toBe('Un duo français.');
    expect(profile?.tags).toEqual(['french house']);
    expect(profile?.listeners).toBe(4200);
    expect(profile?.similar).toEqual([
      { id: '1', name: 'Justice', image: 'https://cdn.deezer.com/j.jpg' },
    ]);
    expect(profile?.topTracks).toEqual([
      { title: 'Around the World', url: 'https://deezer.com/track/1' },
    ]);
    expect(profile?.links).toEqual([{ platform: 'official', url: 'https://daftpunk.com' }]);
    expect(profile?.playedOnRadio).toEqual([
      { title: 'Around the World', artist: 'Daft Punk', playedAt: '2026-07-27T10:00:00.000Z' },
    ]);
    expect(profile?.resolved).toBe(true);
  });

  it('keeps the radio floor when every external source is unavailable', async () => {
    rows = [{ ...artistRow, deezerId: null, mbid: null }];

    const profile = await getArtistProfile('artist-1');

    expect(profile?.resolved).toBe(false);
    expect(profile?.similar).toEqual([]);
    expect(profile?.playedOnRadio).toHaveLength(1);
  });

  it('returns null for an unknown id', async () => {
    rows = [];

    expect(await getArtistProfile('nope')).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter=@aubesonore/backend test artistProfileService`
Expected: FAIL — `Cannot find module './artistProfileService'`

- [ ] **Step 4: Write the implementation**

```ts
// apps/backend/src/services/artistProfileService.ts
import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { artist } from '../db/schema';
import { logger } from '../lib/logger';
import { getArtist, getRelatedArtists, getTopTracks } from './deezerService';
import { getArtistInfo } from './lastfmService';
import { getArtistLinks } from './musicbrainzService';

const SOURCE_TIMEOUT_MS = 6_000;

// A slow source degrades its own section only; the profile still answers.
async function withFallback<V>(label: string, work: Promise<V>, fallback: V): Promise<V> {
  try {
    return await Promise.race([
      work,
      new Promise<V>((_, reject) =>
        setTimeout(() => reject(new Error('source timeout')), SOURCE_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    logger.warn('artistProfile.source_failed', { label, message: (err as Error).message });
    return fallback;
  }
}

export async function getArtistProfile(id: string): Promise<ArtistProfile | null> {
  const rows = await db
    .select({
      id: artist.id,
      displayName: artist.displayName,
      normalizedName: artist.normalizedName,
      slug: artist.slug,
      deezerId: artist.deezerId,
      mbid: artist.mbid,
    })
    .from(artist)
    .where(eq(artist.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [deezerArtist, related, topTracks, lastfm, links, playedOnRadio] = await Promise.all([
    row.deezerId ? withFallback('deezer.artist', getArtist(row.deezerId), null) : null,
    row.deezerId ? withFallback('deezer.related', getRelatedArtists(row.deezerId), []) : [],
    row.deezerId ? withFallback('deezer.top', getTopTracks(row.deezerId), []) : [],
    withFallback('lastfm', getArtistInfo(row.displayName), null),
    row.mbid ? withFallback('musicbrainz', getArtistLinks(row.mbid), []) : [],
    // Our own data — never allowed to fall back to an upstream failure.
    withFallback('radioPlay', getPlaysByArtist(row.normalizedName), []),
  ]);

  return {
    id: row.id,
    name: row.displayName,
    slug: row.slug,
    image: deezerArtist?.picture ?? null,
    bio: lastfm?.bio || null,
    tags: lastfm?.tags ?? [],
    listeners: lastfm?.listeners ?? null,
    similar: related.map((entry) => ({ id: entry.id, name: entry.name, image: entry.picture })),
    topTracks: topTracks.map((track) => ({ title: track.title, url: track.link })),
    links,
    playedOnRadio,
    resolved: row.deezerId !== null,
  };
}
```

Add the import alongside the others:

```ts
import { getPlaysByArtist } from './radioPlayService';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter=@aubesonore/backend test artistProfileService`
Expected: PASS — 2 tests

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/client.ts apps/backend/src/services/artistProfileService.ts apps/backend/src/services/artistProfileService.test.ts
git commit packages/shared-types/src/client.ts apps/backend/src/services/artistProfileService.ts apps/backend/src/services/artistProfileService.test.ts -m "feat(backend): compose an ArtistProfile from Deezer, Last.fm and MusicBrainz"
```

---

## Task 6: Aggregate API route

**Files:**

- Create: `apps/backend/src/validators/artistValidator.ts`
- Modify: `apps/backend/src/routes/artist.routes.ts`
- Test: `apps/backend/src/routes/artist.routes.test.ts`

**Interfaces:**

- Consumes: `getArtistProfile` (Task 5), `resolveArtist` (Task 4), `checkRate`/`getClientIp`.
- Produces: `GET /api/artist/:id` → `ArtistProfile` | 404; `GET /api/artist/resolve?name=` → `{ id, slug }` | 404.

- [ ] **Step 1: Write the validator**

```ts
// apps/backend/src/validators/artistValidator.ts
import * as v from 'valibot';

// Ids are generated with randomUUID; anything else never reaches the DB.
export const ArtistIdSchema = v.pipe(v.string(), v.uuid());

export function isValidArtistId(value: unknown): value is string {
  return v.safeParse(ArtistIdSchema, value).success;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/backend/src/routes/artist.routes.test.ts
import { describe, it, expect, mock, afterEach } from 'bun:test';
import { Elysia } from 'elysia';

const VALID_ID = '11111111-1111-1111-1111-111111111111';

mock.module('../services/artistProfileService', () => ({
  getArtistProfile: (id: string) =>
    Promise.resolve(
      id === VALID_ID
        ? {
            id: VALID_ID,
            name: 'Daft Punk',
            slug: 'daft-punk',
            image: null,
            bio: null,
            tags: [],
            listeners: null,
            similar: [],
            topTracks: [],
            links: [],
            playedOnRadio: [],
            resolved: true,
          }
        : null
    ),
}));

mock.module('../services/artistResolver', () => ({
  resolveArtist: (name: string) =>
    Promise.resolve(name === 'Daft Punk' ? { id: VALID_ID, slug: 'daft-punk' } : null),
}));

const { artistRoutes } = await import('./artist.routes');
const { __resetRateLimits } = await import('../lib/rateLimit');

const app = new Elysia().use(artistRoutes);

afterEach(() => {
  __resetRateLimits();
});

describe('GET /api/artist/:id', () => {
  it('returns the profile for a known id', async () => {
    const res = await app.handle(new Request(`http://localhost/api/artist/${VALID_ID}`));

    expect(res.status).toBe(200);
    expect(((await res.json()) as { name: string }).name).toBe('Daft Punk');
  });

  it('rejects a malformed id at the boundary', async () => {
    const res = await app.handle(new Request('http://localhost/api/artist/not-a-uuid'));

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/artist/22222222-2222-2222-2222-222222222222')
    );

    expect(res.status).toBe(404);
  });
});

describe('GET /api/artist/resolve', () => {
  it('resolves a raw name to a canonical id', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/artist/resolve?name=Daft%20Punk')
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: VALID_ID, slug: 'daft-punk' });
  });

  it('requires a name', async () => {
    const res = await app.handle(new Request('http://localhost/api/artist/resolve'));

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter=@aubesonore/backend test artist.routes`
Expected: FAIL — 404 on `/api/artist/:id` (route does not exist yet)

- [ ] **Step 4: Extend the route file**

Add to `apps/backend/src/routes/artist.routes.ts`, keeping the existing `/` handler:

```ts
import { getArtistProfile } from '../services/artistProfileService';
import { resolveArtist } from '../services/artistResolver';
import { isValidArtistId } from '../validators/artistValidator';
```

```ts
  .get('/resolve', async ({ request, query, set }) => {
    const ip = getClientIp(request.headers);
    if (!checkRate('artist', ip, ARTIST_LIMIT, ARTIST_WINDOW_MS)) {
      set.status = 429;
      set.headers['retry-after'] = '60';
      return { error: 'Trop de requêtes, réessayez dans 1 minute' };
    }

    const name = typeof query?.name === 'string' ? query.name.trim() : '';
    if (!name) {
      set.status = 400;
      return { error: 'Paramètre "name" requis' };
    }

    const resolved = await resolveArtist(name);
    if (!resolved) {
      set.status = 404;
      return { error: 'Artiste non trouvé' };
    }
    return resolved;
  })
  .get('/:id', async ({ request, params, set }) => {
    const ip = getClientIp(request.headers);
    if (!checkRate('artist', ip, ARTIST_LIMIT, ARTIST_WINDOW_MS)) {
      set.status = 429;
      set.headers['retry-after'] = '60';
      return { error: 'Trop de requêtes, réessayez dans 1 minute' };
    }

    if (!isValidArtistId(params.id)) {
      set.status = 400;
      return { error: 'Identifiant invalide' };
    }

    const profile = await getArtistProfile(params.id);
    if (!profile) {
      set.status = 404;
      return { error: 'Artiste non trouvé' };
    }
    return profile;
  });
```

Declare `/resolve` **before** `/:id` so the literal segment is not swallowed by the parameter.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter=@aubesonore/backend test artist.routes`
Expected: PASS — 5 tests

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/validators/artistValidator.ts apps/backend/src/routes/artist.routes.ts apps/backend/src/routes/artist.routes.test.ts
git commit apps/backend/src/validators/artistValidator.ts apps/backend/src/routes/artist.routes.ts apps/backend/src/routes/artist.routes.test.ts -m "feat(backend): expose the aggregated artist profile and resolve endpoints"
```

---

## Task 7: Open Graph document route

Social crawlers do not run JavaScript, so React 19's client-side `<meta>` hoisting is invisible to them ([Facebook crawler docs](https://developers.facebook.com/docs/sharing/webmasters/crawler/)). The backend serves the SPA shell with the tags already in `<head>`. `HTMLRewriter` is native to Bun and encodes attribute values, so no manual escaping is needed for attributes.

**Files:**

- Create: `apps/backend/src/services/templates/artistShell.ts`
- Create: `apps/backend/src/routes/artistPage.routes.ts`
- Test: `apps/backend/src/routes/artistPage.routes.test.ts`
- Modify: `apps/backend/src/config/env.ts`, `apps/backend/src/index.ts`, `apps/frontend/nginx.conf`

**Interfaces:**

- Consumes: `getArtistProfile` (Task 5), `env`, `TtlCache`.
- Produces: `renderArtistShell(shell: string, profile: ArtistProfile, pageUrl: string): Promise<string>`; route `GET /artist/:id` and `GET /artist/:id/:slug`.

- [ ] **Step 1: Add the internal frontend origin to `env.ts`**

```ts
FRONTEND_ORIGIN_INTERNAL: string;
```

```ts
  // Service name on the compose network — used to read the deployed index.html
  // for OG injection. A shared volume would go stale on rebuild.
  FRONTEND_ORIGIN_INTERNAL: Bun.env.FRONTEND_ORIGIN_INTERNAL ?? 'http://frontend',
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/backend/src/routes/artistPage.routes.test.ts
import { describe, it, expect, mock, afterEach } from 'bun:test';
import { Elysia } from 'elysia';

const VALID_ID = '11111111-1111-1111-1111-111111111111';

const SHELL = `<!doctype html><html lang="fr"><head><title>AubeSonore</title></head><body><div id="root"></div></body></html>`;

let profileName = 'Daft Punk';
let profileImage: string | null = 'https://cdn.deezer.com/dp.jpg';

mock.module('../services/artistProfileService', () => ({
  getArtistProfile: (id: string) =>
    Promise.resolve(
      id === VALID_ID
        ? {
            id: VALID_ID,
            name: profileName,
            slug: 'daft-punk',
            image: profileImage,
            bio: 'Un duo français.',
            tags: [],
            listeners: null,
            similar: [],
            topTracks: [],
            links: [],
            playedOnRadio: [],
            resolved: true,
          }
        : null
    ),
}));

const { artistPageRoutes, artistShellCache } = await import('./artistPage.routes');

const originalFetch = globalThis.fetch;
const app = new Elysia().use(artistPageRoutes);

afterEach(() => {
  globalThis.fetch = originalFetch;
  artistShellCache.dispose();
  profileName = 'Daft Punk';
  profileImage = 'https://cdn.deezer.com/dp.jpg';
});

function mockShell(): void {
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(SHELL, { headers: { 'content-type': 'text/html' } })
    )) as typeof fetch;
}

describe('GET /artist/:id', () => {
  it('injects Open Graph tags into the shell', async () => {
    mockShell();

    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('property="og:title"');
    expect(html).toContain('Daft Punk');
    expect(html).toContain('content="https://cdn.deezer.com/dp.jpg"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('<div id="root">');
  });

  it('escapes an artist name containing markup', async () => {
    mockShell();
    profileName = '<script>alert(1)</script>';

    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));

    const html = await res.text();
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('drops an og:image that is not on an allowed host', async () => {
    mockShell();
    profileImage = 'https://evil.example/pwn.jpg';

    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));

    const html = await res.text();
    expect(html).not.toContain('evil.example');
  });

  it('returns 400 on a malformed id', async () => {
    mockShell();

    const res = await app.handle(new Request('http://localhost/artist/not-a-uuid'));

    expect(res.status).toBe(400);
  });

  it('serves the untouched shell when the artist is unknown', async () => {
    mockShell();

    const res = await app.handle(
      new Request('http://localhost/artist/22222222-2222-2222-2222-222222222222')
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<div id="root">');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter=@aubesonore/backend test artistPage.routes`
Expected: FAIL — `Cannot find module './artistPage.routes'`

- [ ] **Step 4: Write the shell renderer**

```ts
// apps/backend/src/services/templates/artistShell.ts
import type { ArtistProfile } from '@aubesonore/shared-types/client';

// Only Deezer's CDN may end up in og:image — an attacker-controlled host there
// would let a poisoned profile dictate what social networks display for us.
const ALLOWED_IMAGE_HOSTS = ['cdn-images.dzcdn.net', 'e-cdns-images.dzcdn.net', 'cdn.deezer.com'];

function isAllowedImage(url: string | null): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function renderArtistShell(
  shell: string,
  profile: ArtistProfile,
  pageUrl: string
): Promise<string> {
  const title = `${profile.name} | AubeSonore`;
  const description = profile.bio
    ? truncate(profile.bio, 200)
    : `${profile.name} — passé sur AubeSonore, radio de découverte musicale.`;

  const tags: Array<[string, string, string]> = [
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:type', 'profile'],
    ['property', 'og:url', pageUrl],
    ['property', 'og:site_name', 'AubeSonore'],
    ['name', 'twitter:card', 'summary_large_image'],
  ];
  if (isAllowedImage(profile.image)) tags.push(['property', 'og:image', profile.image]);

  // HTMLRewriter has no DOM: tags are appended as raw HTML, so every
  // interpolated value goes through escapeHtml first. The XSS test in Step 2
  // is what proves this — do not skip it.
  const rewriter = new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(title);
      },
    })
    .on('head', {
      element(element) {
        for (const [attribute, key, value] of tags) {
          element.append(`<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`, {
            html: true,
          });
        }
      },
    });

  return rewriter
    .transform(new Response(shell, { headers: { 'content-type': 'text/html' } }))
    .text();
}
```

`escapeHtml` is imported from the existing share-page template — it is already the project's escaping helper and is covered by the `/t` route tests:

```ts
import { escapeHtml } from './sharePage';
```

`setInnerContent` defaults to text mode, so the `<title>` content is escaped by HTMLRewriter itself.

- [ ] **Step 5: Write the route**

```ts
// apps/backend/src/routes/artistPage.routes.ts
import { Elysia } from 'elysia';
import { env } from '../config/env';
import { TtlCache } from '../lib/cache/ttlCache';
import { logger } from '../lib/logger';
import { checkRate, getClientIp } from '../lib/rateLimit';
import { getArtistProfile } from '../services/artistProfileService';
import { renderArtistShell } from '../services/templates/artistShell';
import { isValidArtistId } from '../validators/artistValidator';

const PAGE_LIMIT = 60;
const PAGE_WINDOW_MS = 60_000;
const SHELL_TTL_MS = 5 * 60 * 1000;
const RENDERED_TTL_MS = 60 * 60 * 1000;

export const artistShellCache = new TtlCache<string>(SHELL_TTL_MS);

async function loadShell(): Promise<string | null> {
  const cached = artistShellCache.get('shell');
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(`${env.FRONTEND_ORIGIN_INTERNAL}/index.html`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    artistShellCache.set('shell', html);
    return html;
  } catch (err) {
    logger.warn('artistPage.shell_unavailable', { message: (err as Error).message });
    return null;
  }
}

async function handle(
  id: string,
  request: Request,
  set: { status?: number | string; headers: Record<string, string> }
) {
  const ip = getClientIp(request.headers);
  if (!checkRate('artistPage', ip, PAGE_LIMIT, PAGE_WINDOW_MS)) {
    set.status = 429;
    set.headers['retry-after'] = '60';
    return 'Trop de requêtes';
  }

  if (!isValidArtistId(id)) {
    set.status = 400;
    return 'Identifiant invalide';
  }

  const shell = await loadShell();
  if (!shell) {
    set.status = 502;
    return 'Application indisponible';
  }

  set.headers['content-type'] = 'text/html; charset=utf-8';
  set.headers['cache-control'] = 'public, max-age=300';

  const cacheKey = `rendered:${id}`;
  const rendered = artistShellCache.get(cacheKey);
  if (rendered !== undefined) return rendered;

  const profile = await getArtistProfile(id);
  if (!profile) return shell;

  const pageUrl = `${env.FRONTEND_BASE_URL}/artist/${profile.id}/${profile.slug}`;
  const html = await renderArtistShell(shell, profile, pageUrl);
  artistShellCache.set(cacheKey, html, RENDERED_TTL_MS);
  return html;
}

export const artistPageRoutes = new Elysia()
  .get('/artist/:id', ({ request, params, set }) => handle(params.id, request, set))
  .get('/artist/:id/:slug', ({ request, params, set }) => handle(params.id, request, set));
```

- [ ] **Step 6: Mount it in `index.ts`**

Add the import, `.use(artistPageRoutes)` alongside the other routes, plus `artistShellCache.startSweep();` next to the other sweeps and `artistShellCache.dispose();` in `gracefulShutdown`. Do the same for `deezerCache` and `musicbrainzCache`.

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter=@aubesonore/backend test artistPage.routes`
Expected: PASS — 5 tests

- [ ] **Step 8: Add the nginx proxy rule**

In `apps/frontend/nginx.conf`, **before** `location /`:

```nginx
    # Artist pages are served by the backend so social crawlers get real
    # Open Graph tags; the SPA still hydrates from the same HTML.
    location ^~ /artist/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        include /etc/nginx/snippets/security-headers.conf;
    }
```

`^~` stops nginx from evaluating the regex asset location for these paths. Add `depends_on: [backend]` to the `frontend` service in `docker-compose.yml` so the upstream name resolves at startup.

- [ ] **Step 9: Verify the whole path locally**

```bash
docker compose up -d --build frontend backend
curl -s http://127.0.0.1:3002/artist/<a-real-id> | grep -o 'og:title'
```

Expected: `og:title` present; `curl http://127.0.0.1:3002/` still returns the plain shell.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/services/templates/artistShell.ts apps/backend/src/routes/artistPage.routes.ts apps/backend/src/routes/artistPage.routes.test.ts apps/backend/src/config/env.ts apps/backend/src/index.ts apps/frontend/nginx.conf docker-compose.yml
git commit apps/backend/src/services/templates/artistShell.ts apps/backend/src/routes/artistPage.routes.ts apps/backend/src/routes/artistPage.routes.test.ts apps/backend/src/config/env.ts apps/backend/src/index.ts apps/frontend/nginx.conf docker-compose.yml -m "feat(backend): serve artist pages with injected Open Graph tags"
```

---

## Task 8: Router and mini-player

The `<audio>` element is a module singleton in `lib/player.ts` and `NowPlayingPoller` sits above the router, so a route change cannot interrupt the stream. The mini-player is a second view of the same store, not a second player.

**Files:**

- Modify: `apps/frontend/src/App.tsx`, `apps/frontend/package.json`
- Create: `apps/frontend/src/design/organisms/MiniPlayer.tsx` (+ `.stories.tsx`), `apps/frontend/src/components/MiniPlayerContainer.tsx`
- Test: `apps/frontend/src/design/organisms/MiniPlayer.test.tsx`

**Interfaces:**

- Consumes: `usePlayer` from `../../lib/player`, `useNowPlayingStore`.
- Produces: `MiniPlayerProps { title, artist, artworkUrl, isPlaying, onTogglePlay, onOpenArtist }`.

- [ ] **Step 1: Install react-router**

```bash
pnpm --filter @aubesonore/frontend add react-router
```

v7 declarative mode — the package is `react-router`; the `react-router-dom` split is gone. Confirmed React 19 compatible.

- [ ] **Step 2: Write the failing MiniPlayer test**

```tsx
// apps/frontend/src/design/organisms/MiniPlayer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MiniPlayer } from './MiniPlayer';

const baseProps = {
  title: 'Around the World',
  artist: 'Daft Punk',
  artworkUrl: null,
  isPlaying: false,
  onTogglePlay: vi.fn(),
};

describe('MiniPlayer', () => {
  it('shows the current track', () => {
    render(<MiniPlayer {...baseProps} />);

    expect(screen.getByText('Around the World')).toBeInTheDocument();
    expect(screen.getByText('Daft Punk')).toBeInTheDocument();
  });

  it('calls onTogglePlay when the button is pressed', async () => {
    const onTogglePlay = vi.fn();
    render(<MiniPlayer {...baseProps} onTogglePlay={onTogglePlay} />);

    await userEvent.click(screen.getByRole('button', { name: /lecture|pause/i }));

    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('exposes a pause label while playing', () => {
    render(<MiniPlayer {...baseProps} isPlaying={true} />);

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('falls back to the glyph when there is no artwork', () => {
    render(<MiniPlayer {...baseProps} />);

    expect(screen.getByRole('img', { name: /pochette indisponible/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter=@aubesonore/frontend test --run MiniPlayer`
Expected: FAIL — cannot resolve `./MiniPlayer`

- [ ] **Step 4: Implement `MiniPlayer`**

Presentational only: a fixed bottom bar using `CoverGlyph` as artwork fallback, an `IconButton` for play/pause with a 44px target, tokens only (`bg-surface-raised`, `text-text`, `border-border`), and `motion` entrance guarded by `prefers-reduced-motion`. Props interface carries JSDoc for react-docgen-typescript.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter=@aubesonore/frontend test --run MiniPlayer`
Expected: PASS — 4 tests

- [ ] **Step 6: Add the router in `App.tsx`**

```tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const ArtistPage = lazy(() => import('./pages/ArtistPage'));

// NowPlayingPoller stays above <Routes>: the audio element is a module
// singleton, so navigation must never remount the polling that feeds it.
export default function App() {
  useLocaleStore((s) => s.locale);

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <AuthInit />
        <NowPlayingPoller />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/artist/:id/:slug?"
                element={
                  <Suspense fallback={null}>
                    <ArtistPage />
                  </Suspense>
                }
              />
            </Routes>
          </Layout>
          <MiniPlayerContainer />
        </BrowserRouter>
        <AuthModalHost />
        <PWAInstallBanner />
      </MotionConfig>
    </LazyMotion>
  );
}
```

`MiniPlayerContainer` reads `useLocation()` and renders nothing on `/`.

- [ ] **Step 7: Write the Storybook story**

`MiniPlayer.stories.tsx` with `Default`, `Playing`, `SansPochette`, and a `Showcase` render. Verify both themes via the **Thème** toolbar and that addon-a11y is clean.

- [ ] **Step 8: Validate and commit**

```bash
pnpm --filter=@aubesonore/frontend test --run
pnpm typecheck && pnpm lint
FILES="apps/frontend/package.json pnpm-lock.yaml apps/frontend/src/App.tsx apps/frontend/src/design/organisms/MiniPlayer.tsx apps/frontend/src/design/organisms/MiniPlayer.stories.tsx apps/frontend/src/design/organisms/MiniPlayer.test.tsx apps/frontend/src/components/MiniPlayerContainer.tsx"
git add $FILES
git commit $FILES -m "feat(frontend): add routing and a persistent mini-player"
```

`pnpm-lock.yaml` changes when react-router is added — it is included above deliberately.

---

## Task 9: ArtistCard molecule

**Files:**

- Create: `apps/frontend/src/design/molecules/ArtistCard.tsx` (+ `.stories.tsx`, `.test.tsx`)

**Interfaces:**

- Consumes: `CoverGlyph`, `Link` from `react-router`.
- Produces: `ArtistCardProps { id, name, image, slug }`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/frontend/src/design/molecules/ArtistCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ArtistCard } from './ArtistCard';

function renderCard(props: Partial<React.ComponentProps<typeof ArtistCard>> = {}) {
  return render(
    <MemoryRouter>
      <ArtistCard id="abc" name="Justice" slug="justice" image={null} {...props} />
    </MemoryRouter>
  );
}

describe('ArtistCard', () => {
  it('links to the artist route', () => {
    renderCard();

    expect(screen.getByRole('link', { name: /justice/i })).toHaveAttribute(
      'href',
      '/artist/abc/justice'
    );
  });

  it('renders the image when provided', () => {
    renderCard({ image: 'https://cdn.deezer.com/j.jpg' });

    expect(screen.getByRole('img', { name: /justice/i })).toHaveAttribute(
      'src',
      'https://cdn.deezer.com/j.jpg'
    );
  });

  it('falls back to the glyph without an image', () => {
    renderCard();

    expect(screen.getByRole('img', { name: /pochette indisponible/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, watch it fail, implement, re-run**

Implementation: a `<Link>` wrapping a square image (`aspect-ratio` reserved to keep CLS at 0) or `CoverGlyph`, with the name below. Tokens only. `focus-visible` ring, `hover` lift under `prefers-reduced-motion: no-preference`, target ≥ 44px.

- [ ] **Step 3: Story + a11y + contrast**

```bash
node apps/frontend/scripts/check-contrast.mjs
```

- [ ] **Step 4: Commit**

```bash
FILES="apps/frontend/src/design/molecules/ArtistCard.tsx apps/frontend/src/design/molecules/ArtistCard.stories.tsx apps/frontend/src/design/molecules/ArtistCard.test.tsx"
git add $FILES
git commit $FILES -m "feat(frontend): add the ArtistCard molecule"
```

---

## Task 10: Artist page

Five sections, each hidden independently when its source is empty. The radio floor and the platform links always render — that is what makes the page worth having for an artist nobody else documents.

**Files:**

- Create: `apps/frontend/src/design/organisms/ArtistPageView.tsx` (+ `.stories.tsx`, `.test.tsx`), `apps/frontend/src/pages/ArtistPage.tsx`, `apps/frontend/src/lib/artistProfile.ts`

**Interfaces:**

- Consumes: `ArtistProfile` type, `ArtistCard` (Task 9), `CoverGlyph`.
- Produces: `ArtistPageView({ profile, isLoading, error })`; `fetchArtistProfile(id, signal)`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/frontend/src/design/organisms/ArtistPageView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { ArtistPageView } from './ArtistPageView';

const profile: ArtistProfile = {
  id: 'abc',
  name: 'Daft Punk',
  slug: 'daft-punk',
  image: 'https://cdn.deezer.com/dp.jpg',
  bio: 'Un duo français.',
  tags: ['french house'],
  listeners: 4200,
  similar: [{ id: 'j', name: 'Justice', image: null }],
  topTracks: [{ title: 'Around the World', url: 'https://deezer.com/track/1' }],
  links: [{ platform: 'official', url: 'https://daftpunk.com' }],
  playedOnRadio: [
    { title: 'Around the World', artist: 'Daft Punk', playedAt: '2026-07-27T10:00:00.000Z' },
  ],
  resolved: true,
};

function renderView(overrides: Partial<ArtistProfile> = {}) {
  return render(
    <MemoryRouter>
      <ArtistPageView profile={{ ...profile, ...overrides }} isLoading={false} error={null} />
    </MemoryRouter>
  );
}

describe('ArtistPageView', () => {
  it('renders the artist name as the page heading', () => {
    renderView();

    expect(screen.getByRole('heading', { level: 1, name: 'Daft Punk' })).toBeInTheDocument();
  });

  it('renders the bio and tags', () => {
    renderView();

    expect(screen.getByText('Un duo français.')).toBeInTheDocument();
    expect(screen.getByText('french house')).toBeInTheDocument();
  });

  it('hides the bio section entirely when there is none', () => {
    renderView({ bio: null });

    expect(screen.queryByText('Un duo français.')).not.toBeInTheDocument();
  });

  it('hides the similar section when the list is empty', () => {
    renderView({ similar: [] });

    expect(screen.queryByRole('link', { name: /justice/i })).not.toBeInTheDocument();
  });

  it('falls back to the glyph when there is no image', () => {
    renderView({ image: null });

    expect(screen.getByRole('img', { name: /pochette indisponible/i })).toBeInTheDocument();
  });

  it('still renders the platform links for an unresolved artist', () => {
    renderView({ resolved: false, bio: null, similar: [], image: null });

    expect(screen.getByRole('link', { name: /daftpunk\.com|site officiel/i })).toBeInTheDocument();
  });

  it('renders the radio floor even when every external source is empty', () => {
    renderView({ resolved: false, bio: null, tags: [], similar: [], topTracks: [], image: null });

    expect(screen.getByText(/passé sur aubesonore/i)).toBeInTheDocument();
    expect(screen.getByText('Around the World')).toBeInTheDocument();
  });

  it('hides the radio section before the antenna has played the artist', () => {
    renderView({ playedOnRadio: [] });

    expect(screen.queryByText(/passé sur aubesonore/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, watch it fail, implement, re-run**

Run: `pnpm --filter=@aubesonore/frontend test --run ArtistPageView`

- [ ] **Step 3: Write the client fetch layer**

```ts
// apps/frontend/src/lib/artistProfile.ts
import { LruCache } from '@aubesonore/core/lru-cache';
import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { API_BASE_URL } from '../utils/config';

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new LruCache<string, { data: ArtistProfile; expiresAt: number }>(50);

export async function fetchArtistProfile(
  id: string,
  signal?: AbortSignal
): Promise<ArtistProfile | null> {
  const cached = cache.get(id);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const response = await fetch(`${API_BASE_URL}/api/artist/${encodeURIComponent(id)}`, {
    signal: signal ?? null,
  });
  if (!response.ok) return null;

  const profile = (await response.json()) as ArtistProfile;
  cache.set(id, { data: profile, expiresAt: Date.now() + TTL_MS });
  return profile;
}
```

- [ ] **Step 4: Write the container**

`ArtistPage.tsx` reads `useParams()`, calls `fetchArtistProfile` in an effect with an `AbortController`, and renders `<ArtistPageView>` with loading and error states. Show a skeleton, not a spinner.

- [ ] **Step 5: Story covering every degradation branch**

`Complet`, `SansBio`, `SansSimilaires`, `SansImage`, `NonResolu`, `Chargement`, `Erreur`, plus `Showcase`. Both themes, addon-a11y clean.

- [ ] **Step 6: Validate and commit**

```bash
pnpm --filter=@aubesonore/frontend test --run
node apps/frontend/scripts/check-contrast.mjs
pnpm typecheck && pnpm lint
FILES="apps/frontend/src/design/organisms/ArtistPageView.tsx apps/frontend/src/design/organisms/ArtistPageView.stories.tsx apps/frontend/src/design/organisms/ArtistPageView.test.tsx apps/frontend/src/pages/ArtistPage.tsx apps/frontend/src/lib/artistProfile.ts"
git add $FILES
git commit $FILES -m "feat(frontend): add the artist discovery page"
```

---

## Task 11: Wire the entry points and clean up

**Files:**

- Modify: `apps/frontend/src/components/Player/ArtistBio.tsx` or its parent, `apps/frontend/src/stores/artistPanelStore.ts`
- Delete: `apps/frontend/src/lib/artistInfo.ts`
- Modify: `CLAUDE.md`, `apps/frontend/CLAUDE.md`

**Interfaces:**

- Consumes: everything above.
- Produces: no new exports.

- [ ] **Step 1: Link the now-playing artist to the page**

Replace the slide-panel trigger with a link that calls `GET /api/artist/resolve?name=<now playing artist>` and navigates to `/artist/:id/:slug`. Keep the panel if it is still used elsewhere; otherwise delete it in this task.

- [ ] **Step 2: Delete the superseded client cache**

`apps/frontend/src/lib/artistInfo.ts` and its `ArtistInfo` import are replaced by `artistProfile.ts`. Remove the old `GET /api/artist?name=` handler from `artist.routes.ts` only once nothing calls it — grep first:

```bash
grep -rn "artistInfo\|api/artist?name" apps/frontend/src packages
```

- [ ] **Step 3: Update the agent docs**

In root `CLAUDE.md`, remove `react-router-dom` from the "don't re-introduce" list (react-router v7 is now a deliberate dependency) and add a short "Working with artist enrichment" section describing the cascade, the `artist` table and the OG route. Update the frontend `CLAUDE.md` if the design-system inventory is listed there.

- [ ] **Step 4: Full validation**

```bash
pnpm typecheck
pnpm lint
pnpm --filter=@aubesonore/frontend test --run
pnpm --filter=@aubesonore/backend test
node apps/frontend/scripts/check-contrast.mjs
docker compose build frontend backend
```

- [ ] **Step 5: Commit**

```bash
FILES="CLAUDE.md apps/frontend/src/App.tsx apps/backend/src/routes/artist.routes.ts"
# add whichever of these the grep in Step 2 showed as still referencing the old cache:
#   apps/frontend/src/components/Player/ArtistBio.tsx
#   apps/frontend/src/components/Player/ArtistContext.tsx
#   apps/frontend/src/stores/artistPanelStore.ts
git rm apps/frontend/src/lib/artistInfo.ts
git add $FILES
git commit $FILES apps/frontend/src/lib/artistInfo.ts -m "refactor(frontend): route artist links to the new page and drop the old cache"
```

---

## Deferred, deliberately

- **Same-origin switchover** (nginx `/api` proxy, `VITE_API_URL` relative, cookies `sameSite: 'lax'`, dropping CORS) — its own change, so the hosting cutover is verified before auth behaviour moves.
- **Most-liked-artists board, user profiles, chat** — different features, out of this spec.
- **`LikedTracksModal` timeout flake** — `renders only 50 rows…` takes ~5.2s against a 5s limit. Pre-existing, unrelated to this work, worth its own fix.
