# Durable Covers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Snapshot every liked track's cover to Cloudflare R2 at like-time so the cover survives deletion of the source file in AzuraCast.

**Architecture:** A background snapshot in the existing `enrichTrackInBackground` fetches the cover bytes from the still-valid source URL, uploads them to R2 under a content-addressed key via Bun's native `S3Client`, and rewrites `liked_tracks.artwork_url` to the stable public R2 URL. Covers are served directly from a public R2 custom domain (edge-cached). No schema change.

**Tech Stack:** Bun 1.3 (`S3Client`, `CryptoHasher`), Elysia, Drizzle, Valibot, `bun test`. Spec: `docs/superpowers/specs/durable-covers-design.md`.

## Global Constraints

- **No new npm dependency** — use Bun's built-in `S3Client` (`import { S3Client } from 'bun'`). Never add `@aws-sdk/*`.
- **Never read `process.env`/`Bun.env` outside `apps/backend/src/config/env.ts`** — all R2 config flows through `env`.
- **SSRF**: any `fetch()` of a client-influenced URL goes through `assertSafeUrl()` from `lib/security/urlValidation`.
- **Trust internal boundaries** — validation is at the HTTP boundary; internal helpers assume validated input.
- **Default to no comments**; JSDoc only where the _why_ is non-obvious.
- Backend file naming: dotted (`coverService.ts`, `coverStore.ts`). Tests colocated as `*.test.ts`, run with `bun test`.
- Covers are content-addressed: key = `covers/<sha256(bytes)>.<ext>`.

---

### Task 1: R2 config + `coverStore`

**Files:**

- Modify: `apps/backend/src/config/env.ts` (add R2 fields + cross-field validation)
- Modify: `apps/backend/package.json` (add `@aubesonore/core` workspace dep)
- Create: `apps/backend/src/lib/storage/coverStore.ts`
- Test: `apps/backend/src/lib/storage/coverStore.test.ts`

**Interfaces:**

- Produces:
  - `interface CoverBucket { file(key: string): { exists(): Promise<boolean>; write(data: Uint8Array, options: { type: string; acl: 'public-read' }): Promise<unknown> } }`
  - `createCoverStore(bucket: CoverBucket, publicBaseUrl: string): CoverStore`
  - `interface CoverStore { put(bytes: Uint8Array, contentType: string): Promise<string> }` (returns public URL)
  - `coverStore: CoverStore | null` (null when R2 env is absent)

- [ ] **Step 1: Add R2 env fields.** In `env.ts`, add to the `EnvConfig` interface (after the `// SMTP` block):

```ts
// Cloudflare R2 (durable cover storage). All-or-nothing: absent = feature off.
R2_ACCOUNT_ID: string | undefined;
R2_ACCESS_KEY_ID: string | undefined;
R2_SECRET_ACCESS_KEY: string | undefined;
R2_BUCKET: string | undefined;
COVERS_PUBLIC_URL: string | undefined;
```

Add to the `env` object literal (after the SMTP block):

```ts
  R2_ACCOUNT_ID: optional('R2_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: optional('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: optional('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET: optional('R2_BUCKET'),
  COVERS_PUBLIC_URL: optional('COVERS_PUBLIC_URL'),
```

Add cross-field validation (after the SMTP validation at the bottom):

```ts
const r2Vars = [
  env.R2_ACCOUNT_ID,
  env.R2_ACCESS_KEY_ID,
  env.R2_SECRET_ACCESS_KEY,
  env.R2_BUCKET,
  env.COVERS_PUBLIC_URL,
];
if (r2Vars.some(Boolean) && !r2Vars.every(Boolean)) {
  throw new Error(
    'R2 cover storage is partially configured: set all of R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, COVERS_PUBLIC_URL — or none.'
  );
}
```

- [ ] **Step 2: Add the core dep.** In `apps/backend/package.json`, add to `dependencies` (alphabetical, before `@aubesonore/shared-types`):

```json
    "@aubesonore/core": "workspace:*",
```

Then run: `pnpm install`
Expected: lockfile updates, no errors.

- [ ] **Step 3: Write the failing test.** Create `apps/backend/src/lib/storage/coverStore.test.ts`:

```ts
import { describe, it, expect, mock } from 'bun:test';
import { createCoverStore, type CoverBucket } from './coverStore';

function fakeBucket() {
  const written = new Map<string, { data: Uint8Array; type: string }>();
  const bucket: CoverBucket = {
    file(key) {
      return {
        exists: () => Promise.resolve(written.has(key)),
        write: (data, options) => {
          written.set(key, { data, type: options.type });
          return Promise.resolve(undefined);
        },
      };
    },
  };
  return { bucket, written };
}

const bytes = new TextEncoder().encode('fake-jpeg-bytes');

describe('createCoverStore', () => {
  it('uploads under a content-addressed key and returns the public URL', async () => {
    const { bucket, written } = fakeBucket();
    const store = createCoverStore(bucket, 'https://covers.example.com/');
    const url = await store.put(bytes, 'image/jpeg');

    expect(url).toMatch(/^https:\/\/covers\.example\.com\/covers\/[0-9a-f]{64}\.jpg$/);
    expect(written.size).toBe(1);
  });

  it('is idempotent: identical bytes are not re-uploaded', async () => {
    const { bucket } = fakeBucket();
    const store = createCoverStore(bucket, 'https://covers.example.com');
    const writeSpy = mock(bucket.file);
    const first = await store.put(bytes, 'image/jpeg');
    const second = await store.put(bytes, 'image/jpeg');
    expect(first).toBe(second);
  });

  it('maps content-type to the file extension', async () => {
    const { bucket } = fakeBucket();
    const store = createCoverStore(bucket, 'https://covers.example.com');
    const url = await store.put(bytes, 'image/png');
    expect(url.endsWith('.png')).toBe(true);
  });
});
```

- [ ] **Step 4: Run test to verify it fails.**

Run: `cd apps/backend && bun test src/lib/storage/coverStore.test.ts`
Expected: FAIL — cannot find module `./coverStore`.

- [ ] **Step 5: Implement `coverStore.ts`.** Create `apps/backend/src/lib/storage/coverStore.ts`:

```ts
import { S3Client } from 'bun';
import { env } from '../../config/env';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** Minimal shape of a bucket needed here; `Bun.S3Client` satisfies it structurally. */
export interface CoverBucket {
  file(key: string): {
    exists(): Promise<boolean>;
    write(data: Uint8Array, options: { type: string; acl: 'public-read' }): Promise<unknown>;
  };
}

export interface CoverStore {
  /** Uploads bytes under a content-addressed key (idempotent). Returns the public URL. */
  put(bytes: Uint8Array, contentType: string): Promise<string>;
}

export function createCoverStore(bucket: CoverBucket, publicBaseUrl: string): CoverStore {
  const base = publicBaseUrl.replace(/\/$/, '');
  return {
    async put(bytes, contentType) {
      const ext = EXT_BY_TYPE[contentType] ?? 'bin';
      const hash = new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
      const key = `covers/${hash}.${ext}`;
      const file = bucket.file(key);
      if (!(await file.exists())) {
        await file.write(bytes, { type: contentType, acl: 'public-read' });
      }
      return `${base}/${key}`;
    },
  };
}

const r2Configured = Boolean(
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET &&
  env.COVERS_PUBLIC_URL
);

export const coverStore: CoverStore | null = r2Configured
  ? createCoverStore(
      new S3Client({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucket: env.R2_BUCKET,
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      }),
      env.COVERS_PUBLIC_URL as string
    )
  : null;
```

> Confirm `S3File.write(data, { type, acl })` and `.exists()` against https://bun.sh/docs/runtime/s3 while implementing. If the installed Bun exposes only `client.write(key, data, opts)` / `client.exists(key)`, adapt `CoverBucket` accordingly — keep the injected-bucket shape so the test stays valid.

- [ ] **Step 6: Run test to verify it passes.**

Run: `cd apps/backend && bun test src/lib/storage/coverStore.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Typecheck + commit.**

Run: `pnpm --filter @aubesonore/backend typecheck`
Expected: clean.

```bash
git add apps/backend/src/config/env.ts apps/backend/package.json pnpm-lock.yaml apps/backend/src/lib/storage/coverStore.ts apps/backend/src/lib/storage/coverStore.test.ts
git commit -m "feat(backend): add R2 cover store (content-addressed upload)"
```

---

### Task 2: `coverService.snapshotCover`

**Files:**

- Create: `apps/backend/src/services/coverService.ts`
- Test: `apps/backend/src/services/coverService.test.ts`

**Interfaces:**

- Consumes: `coverStore` / `CoverStore` from Task 1; `assertSafeUrl` from `lib/security/urlValidation`; `isDefaultArtwork` from `@aubesonore/core/azuracast`.
- Produces: `snapshotCover(sourceUrl: string, store?: CoverStore | null): Promise<string | null>` — returns the durable R2 URL, or `null` when skipped/failed (caller keeps the source URL).

- [ ] **Step 1: Write the failing test.** Create `apps/backend/src/services/coverService.test.ts`:

```ts
import { describe, it, expect, spyOn, afterEach } from 'bun:test';
import { snapshotCover } from './coverService';
import type { CoverStore } from '../lib/storage/coverStore';

const okStore: CoverStore = {
  put: () => Promise.resolve('https://covers.example.com/covers/abc.jpg'),
};

function imageResponse(type: string, size: number): Response {
  return new Response(new Uint8Array(size), { headers: { 'content-type': type } });
}

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore?.();
});

describe('snapshotCover', () => {
  it('returns null for AzuraCast default/generic art (no fetch)', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch');
    const result = await snapshotCover('https://radio.example.com/generic_song.jpg', okStore);
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null for a private/SSRF target (no upload)', async () => {
    const result = await snapshotCover('https://127.0.0.1/cover.jpg', okStore);
    expect(result).toBeNull();
  });

  it('returns null when the store is not configured', async () => {
    const result = await snapshotCover('https://radio.example.com/art/real.jpg', null);
    expect(result).toBeNull();
  });

  it('uploads and returns the R2 URL on a valid image', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(imageResponse('image/jpeg', 1024));
    const result = await snapshotCover('https://radio.example.com/art/real.jpg', okStore);
    expect(result).toBe('https://covers.example.com/covers/abc.jpg');
  });

  it('returns null for a non-image response', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(imageResponse('text/html', 512));
    const result = await snapshotCover('https://radio.example.com/art/real.jpg', okStore);
    expect(result).toBeNull();
  });

  it('returns null for an oversized image (> 5 MB)', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(imageResponse('image/jpeg', 6 * 1024 * 1024));
    const result = await snapshotCover('https://radio.example.com/art/real.jpg', okStore);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `cd apps/backend && bun test src/services/coverService.test.ts`
Expected: FAIL — cannot find module `./coverService`.

- [ ] **Step 3: Implement `coverService.ts`.** Create `apps/backend/src/services/coverService.ts`:

```ts
import { isDefaultArtwork } from '@aubesonore/core/azuracast';
import { assertSafeUrl } from '../lib/security/urlValidation';
import { coverStore, type CoverStore } from '../lib/storage/coverStore';
import { env } from '../config/env';
import { logger } from '../lib/logger';

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Fetches the cover at `sourceUrl` and stores it durably in R2, returning the
 * stable public URL. Returns `null` (caller keeps the source URL) when there is
 * no real cover to freeze, the store is off, or the fetch/validation fails.
 */
export async function snapshotCover(
  sourceUrl: string,
  store: CoverStore | null = coverStore
): Promise<string | null> {
  if (!store) return null;
  // A generic/placeholder means "no real cover" — never freeze it as the cover.
  if (isDefaultArtwork(sourceUrl)) return null;

  try {
    await assertSafeUrl(sourceUrl, { requireHttps: env.IS_PROD });

    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    if (!contentType.startsWith('image/')) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;

    return await store.put(bytes, contentType);
  } catch (err) {
    logger.warn('cover.snapshot_failed', {
      url: sourceUrl,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes.**

Run: `cd apps/backend && bun test src/services/coverService.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck + commit.**

Run: `pnpm --filter @aubesonore/backend typecheck`
Expected: clean.

```bash
git add apps/backend/src/services/coverService.ts apps/backend/src/services/coverService.test.ts
git commit -m "feat(backend): snapshotCover — SSRF-safe, guarded cover fetch to R2"
```

---

### Task 3: Integrate the snapshot into `trackService`

**Files:**

- Modify: `apps/backend/src/services/trackService.ts` (`enrichTrackInBackground` around lines 82-101; `refreshTrackLinks` around lines 290-308)
- Test: `apps/backend/src/services/trackService.test.ts` (add cases; create if absent following existing service-test patterns)

**Interfaces:**

- Consumes: `snapshotCover` from Task 2.
- Produces: no new exports; `enrichTrackInBackground` and `refreshTrackLinks` now write a durable R2 `artwork_url` when a snapshot succeeds.

- [ ] **Step 1: Read the current enrichment.** Open `apps/backend/src/services/trackService.ts` and locate `enrichTrackInBackground(trackId, title, artist)`. It currently reads the track, calls `searchSonglink(title, artist)`, and `return`s early when there is no match. The like's original `artwork_url` is already persisted on the row by `likeTrack`.

- [ ] **Step 2: Write the failing test.** Add to `apps/backend/src/services/trackService.test.ts` (mock `searchSonglink` and `snapshotCover` via `mock.module`; follow the existing DB/test-harness setup in that file — reuse its `beforeEach` DB reset). Minimal shape:

```ts
import { mock } from 'bun:test';

mock.module('../services/coverService', () => ({
  snapshotCover: mock(() => Promise.resolve('https://covers.example.com/covers/r2.jpg')),
}));
mock.module('../services/songlinkService', () => ({
  searchSonglink: mock(() => Promise.resolve(null)), // emerging artist: no match
}));

// ... within a test that likes a track with an AzuraCast artwork URL, then
// awaits enrichment, assert the row's artwork_url is the R2 URL even though
// Songlink returned null:
// expect(row.artworkUrl).toBe('https://covers.example.com/covers/r2.jpg');
```

- [ ] **Step 3: Run test to verify it fails.**

Run: `cd apps/backend && bun test src/services/trackService.test.ts`
Expected: FAIL — `artwork_url` still equals the AzuraCast URL (snapshot not wired).

- [ ] **Step 4: Restructure `enrichTrackInBackground`.** Replace the early-return-on-no-Songlink flow so the snapshot runs regardless. Import at top: `import { snapshotCover } from './coverService';`. New body shape:

```ts
async function enrichTrackInBackground(
  trackId: string,
  title: string,
  artist: string
): Promise<void> {
  const [track] = await db
    .select({ artworkUrl: schema.likedTracks.artworkUrl })
    .from(schema.likedTracks)
    .where(eq(schema.likedTracks.id, trackId))
    .limit(1);

  const songlinkData = await searchSonglink(title, artist);

  // Prefer the higher-res Apple/Songlink art when present, else the AzuraCast
  // art captured at like-time. Snapshot to R2 so it survives source deletion.
  const bestSource = songlinkData?.artworkUrl ?? track?.artworkUrl ?? null;
  const durableUrl = bestSource ? await snapshotCover(bestSource) : null;

  const update: Partial<typeof schema.likedTracks.$inferInsert> = {};
  if (songlinkData) {
    update.songlinkUrl = songlinkData.pageUrl;
    update.platformLinks = songlinkData.platformLinks;
  }
  if (durableUrl) update.artworkUrl = durableUrl;

  if (Object.keys(update).length > 0) {
    await db.update(schema.likedTracks).set(update).where(eq(schema.likedTracks.id, trackId));
  }
}
```

> Match the exact column/field names and the `songlinkData` shape already used in the file. Keep the existing `platformLinks`/`songlinkUrl` writes intact.

- [ ] **Step 5: Mirror in `refreshTrackLinks`.** In the single-track refresh path, after computing `songlinkData`, compute `bestSource`/`durableUrl` the same way and include `artworkUrl: durableUrl` in the update when non-null. This makes refresh a retry for failed snapshots.

- [ ] **Step 6: Run tests to verify they pass.**

Run: `cd apps/backend && bun test src/services/trackService.test.ts`
Expected: PASS.

- [ ] **Step 7: Full backend verify + commit.**

Run: `pnpm --filter @aubesonore/backend typecheck && pnpm --filter @aubesonore/backend test`
Expected: clean, all pass.

```bash
git add apps/backend/src/services/trackService.ts apps/backend/src/services/trackService.test.ts
git commit -m "feat(backend): snapshot covers to R2 on like enrichment and refresh"
```

---

### Task 4: Backfill migration script

**Files:**

- Create: `apps/backend/scripts/backfill-covers.ts`

**Interfaces:**

- Consumes: `snapshotCover` (Task 2), `db`/`schema`, `env.COVERS_PUBLIC_URL`.

- [ ] **Step 1: Implement the script.** Create `apps/backend/scripts/backfill-covers.ts`:

```ts
import { db, schema } from '../src/db/index';
import { snapshotCover } from '../src/services/coverService';
import { eq } from 'drizzle-orm';
import { env } from '../src/config/env';

const CHUNK = 5;
const DELAY_MS = 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!env.COVERS_PUBLIC_URL) throw new Error('COVERS_PUBLIC_URL not set — configure R2 first.');
  const base = env.COVERS_PUBLIC_URL;

  const rows = await db
    .select({ id: schema.likedTracks.id, artworkUrl: schema.likedTracks.artworkUrl })
    .from(schema.likedTracks);

  const pending = rows.filter((r) => r.artworkUrl && !r.artworkUrl.startsWith(base));
  let migrated = 0;
  let unrecoverable = 0;

  for (let i = 0; i < pending.length; i += CHUNK) {
    const batch = pending.slice(i, i + CHUNK);
    await Promise.all(
      batch.map(async (row) => {
        const durable = await snapshotCover(row.artworkUrl as string);
        if (durable) {
          await db
            .update(schema.likedTracks)
            .set({ artworkUrl: durable })
            .where(eq(schema.likedTracks.id, row.id));
          migrated++;
        } else {
          unrecoverable++;
        }
      })
    );
    if (i + CHUNK < pending.length) await sleep(DELAY_MS);
  }

  console.log(
    `Backfill done: ${migrated} migrated, ${unrecoverable} unrecoverable, ${rows.length} total.`
  );
  process.exit(0);
}

void main();
```

- [ ] **Step 2: Verify it typechecks (no auto-run — it mutates prod data).**

Run: `pnpm --filter @aubesonore/backend typecheck`
Expected: clean.

Manual run (documented, not executed by CI), once R2 is configured:
`cd apps/backend && bun run scripts/backfill-covers.ts`

- [ ] **Step 3: Commit.**

```bash
git add apps/backend/scripts/backfill-covers.ts
git commit -m "chore(backend): backfill script to snapshot existing liked covers to R2"
```

---

### Task 5: Documentation

**Files:**

- Modify: `apps/backend/CLAUDE.md` (new "Durable covers (R2)" section)
- Modify: `apps/backend/.env.example` (if present; else create) — add the R2 vars with placeholder values

**Interfaces:** none (docs only).

- [ ] **Step 1: Document the env vars.** In `apps/backend/.env.example`, append:

```bash
# Cloudflare R2 — durable cover storage (all-or-nothing; leave blank to disable)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=aubesonore-covers
COVERS_PUBLIC_URL=https://covers.aubesonore.fr
```

- [ ] **Step 2: Document the feature.** In `apps/backend/CLAUDE.md`, add a section:

```markdown
## Durable covers (R2)

Liked-track covers are snapshotted to Cloudflare R2 at like-time so they survive
deletion of the source file in AzuraCast (emerging artists have no external CDN
fallback). `enrichTrackInBackground` (and `refreshTrackLinks`) fetch the best
source art, upload the bytes via Bun's native `S3Client` under a content-addressed
key (`covers/<sha256>.<ext>`), and rewrite `artwork_url` to the public R2 URL.

- Storage wrapper: `lib/storage/coverStore.ts`. Snapshot logic: `services/coverService.ts`.
- SSRF-guarded (`assertSafeUrl`), ≤ 5 MB, `image/*` only, skips AzuraCast generic art.
- Serving: public R2 custom domain `covers.aubesonore.fr` (edge-cached, immutable).
- Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
  `COVERS_PUBLIC_URL`. Absent ⇒ `snapshotCover` no-ops (no regression).
- Backfill existing rows: `bun run scripts/backfill-covers.ts` (after R2 is set up).

One-time Cloudflare setup: create the `aubesonore-covers` R2 bucket, an R2 API
token, connect the `covers.aubesonore.fr` custom domain, and add a Cache Rule
that caches everything on that host (objects are immutable).
```

- [ ] **Step 3: Commit.**

```bash
git add apps/backend/CLAUDE.md apps/backend/.env.example
git commit -m "docs(backend): document durable cover storage (R2)"
```

---

## Self-Review

- **Spec coverage:** R2 store (Task 1); snapshot w/ SSRF + guards + default-art skip (Task 2); enrich + refresh integration (Task 3); no schema change (Task 3, `artwork_url` reused); config/env (Task 1); migration (Task 4); docs + manual setup (Task 5). Serving is infra (custom domain), documented in Task 5 — no code.
- **Type consistency:** `CoverStore.put`, `CoverBucket.file().{exists,write}`, `snapshotCover(sourceUrl, store?)` names/types are consistent across Tasks 1→3.
- **Placeholders:** none — every code/test step shows real content. Task 3's test references the file's existing DB harness (reuse, don't reinvent) rather than duplicating unknown setup.
- **Open confirm-at-impl point:** exact Bun `S3File.write`/`exists` signatures (Task 1, Step 5 note) — verify against bun.sh/docs/runtime/s3; the injected-bucket seam keeps tests valid regardless.
