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
// first — binding it to an id would poison the persisted resolution.
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

    const first = payload.data?.[0];
    const candidate = first ? toArtist(first) : null;
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
    if (!payload) return null;

    const artist = toArtist(payload);
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

    const tracks = (payload.data ?? []).flatMap((raw) =>
      typeof raw.title === 'string' && typeof raw.link === 'string'
        ? [{ title: raw.title, link: raw.link }]
        : []
    );
    deezerCache.set(key, tracks);
    return tracks;
  })) as DeezerTrack[];
}

/** Test seam: the breaker is module state and would leak between test files. */
export function __resetDeezerCircuit(): void {
  circuitOpenUntil = 0;
}
