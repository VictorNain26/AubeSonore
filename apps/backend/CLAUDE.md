## Durable covers (R2)

Liked-track covers are snapshotted to Cloudflare R2 at like-time so they survive
deletion of the source file in AzuraCast (emerging artists have no external CDN
fallback). `enrichTrackInBackground`, `refreshTrackLinks`, and `refreshAllLinks`
fetch the best source art, upload the bytes via Bun's native `S3Client` under a
content-addressed key (`covers/<sha256>.<ext>`), and rewrite `artwork_url` to the
public R2 URL.

- Storage wrapper: `lib/storage/coverStore.ts`. Snapshot logic: `services/coverService.ts`.
- SSRF-guarded (`assertSafeUrl`), ≤ 5 MB, `image/*` only, skips AzuraCast generic art.
- Serving: public R2 custom domain `covers.aubesonore.fr` (edge-cached, immutable).
- Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
  `COVERS_PUBLIC_URL`. Absent ⇒ `snapshotCover` no-ops (no regression).
- Backfill existing rows: `bun run scripts/backfill-covers.ts` (after R2 is set up).

One-time Cloudflare setup: create the `aubesonore-covers` R2 bucket, an R2 API
token, connect the `covers.aubesonore.fr` custom domain, and add a Cache Rule
that caches everything on that host (objects are immutable).
