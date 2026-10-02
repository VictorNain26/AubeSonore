import { TtlCache } from '../lib/cache/ttlCache';
import { createSingleFlight } from '../lib/singleFlight';
import { logger } from '../lib/logger';

export interface DeezerArtist {
  id: string;
  name: string;
  picture: string | null;
}

const DEEZER_API = 'https://api.deezer.com';
const POSITIVE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000;
const CIRCUIT_OPEN_MS = 60 * 1000;
const TIMEOUT_MS = 5_000;
// Deezer answers its errors with HTTP 200 and an `error` body. 800 ("no data")
// is a definitive miss (measured: GET /artist/999999999999); any other error
// is treated as a failure, as deezer-python does (DeezerErrorResponse).
const DATA_NOT_FOUND = 800;

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

type Fetched<T> = { status: 'ok'; body: T } | { status: 'missing' } | { status: 'failed' };

async function getJson<T>(path: string): Promise<Fetched<T>> {
  if (Date.now() < circuitOpenUntil) return { status: 'failed' };

  let response: Response;
  try {
    response = await fetch(`${DEEZER_API}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    logger.warn('deezer.network_error', { path, message: (err as Error).message });
    return { status: 'failed' };
  }

  if (response.status === 429) {
    circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
    logger.warn('deezer.circuit_open', { durationMs: CIRCUIT_OPEN_MS });
    return { status: 'failed' };
  }
  if (!response.ok) {
    logger.warn('deezer.upstream_error', { path, status: response.status });
    return { status: 'failed' };
  }

  const body = (await response.json()) as T & { error?: { code?: unknown } };
  if (body.error) {
    if (body.error.code === DATA_NOT_FOUND) return { status: 'missing' };
    logger.warn('deezer.error_body', { path, code: body.error.code });
    return { status: 'failed' };
  }
  return { status: 'ok', body };
}

export type ArtistSearch =
  | { status: 'match'; artist: DeezerArtist }
  | { status: 'none' }
  | { status: 'failed' };

/**
 * Deezer's top hit, kept only when its name normalizes to the searched one:
 * a different artist that merely ranked first would poison the persisted
 * resolution. A failure is reported as such, never as "no match", so a Deezer
 * outage cannot mark an artist unknown for good.
 */
export async function searchArtist(
  name: string,
  normalizeName: (value: string) => string
): Promise<ArtistSearch> {
  const key = `search:${name.toLowerCase()}`;
  const cached = deezerCache.get(key);
  if (cached !== undefined) return cached as ArtistSearch;

  return (await flight(key, async () => {
    const fetched = await getJson<{ data?: RawArtist[] }>(
      `/search/artist?limit=1&q=${encodeURIComponent(name)}`
    );
    if (fetched.status === 'failed') return { status: 'failed' };

    const first = fetched.status === 'ok' ? fetched.body.data?.[0] : undefined;
    const candidate = first ? toArtist(first) : null;
    const result: ArtistSearch =
      candidate && normalizeName(candidate.name) === normalizeName(name)
        ? { status: 'match', artist: candidate }
        : { status: 'none' };
    deezerCache.set(key, result, result.status === 'none' ? NEGATIVE_TTL_MS : undefined);
    return result;
  })) as ArtistSearch;
}

export async function getArtist(id: string): Promise<DeezerArtist | null> {
  const key = `artist:${id}`;
  const cached = deezerCache.get(key);
  if (cached !== undefined) return cached as DeezerArtist | null;

  return (await flight(key, async () => {
    const fetched = await getJson<RawArtist>(`/artist/${encodeURIComponent(id)}`);
    if (fetched.status === 'failed') return null;

    const artist = fetched.status === 'ok' ? toArtist(fetched.body) : null;
    deezerCache.set(key, artist, artist ? undefined : NEGATIVE_TTL_MS);
    return artist;
  })) as DeezerArtist | null;
}

/** Test seam: the breaker is module state and would leak between test files. */
export function __resetDeezerCircuit(): void {
  circuitOpenUntil = 0;
}
