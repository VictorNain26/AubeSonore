import { isDefaultArtwork } from '@aubesonore/core/azuracast';
import { assertSafeUrl } from '../lib/security/urlValidation';
import { coverStore, SUPPORTED_COVER_TYPES, type CoverStore } from '../lib/storage/coverStore';
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

    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'error',
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    if (!SUPPORTED_COVER_TYPES.has(contentType)) return null;

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
