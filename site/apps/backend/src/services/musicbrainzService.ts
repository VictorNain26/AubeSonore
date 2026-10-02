import type { ArtistFacts, ArtistLink, ArtistPlatform } from '@aubesonore/shared-types/client';
import { env } from '../config/env';
import { TtlCache } from '../lib/cache/ttlCache';
import { createSingleFlight } from '../lib/singleFlight';
import { logger } from '../lib/logger';

export interface MusicBrainzArtist {
  facts: ArtistFacts;
  links: ArtistLink[];
  /** The Wikidata item, the way to the artist's Wikipedia articles. */
  wikidataId: string | null;
}

export type Lookup<V> = { status: 'found'; value: V } | { status: 'none' } | { status: 'failed' };

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 5_000;
// MusicBrainz caps anonymous clients at one request per second and bans
// callers that ignore it. https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
const MIN_INTERVAL_MS = 1_000;

const KINDS: Record<string, ArtistFacts['kind']> = {
  Person: 'person',
  Group: 'group',
  Orchestra: 'orchestra',
  Choir: 'choir',
};

// Listening platforms first, the official site last. Deezer is left out: the
// artist's own Deezer id is already known, exactly.
const LINK_ORDER: ArtistPlatform[] = [
  'spotify',
  'appleMusic',
  'bandcamp',
  'soundcloud',
  'official',
];

const LINK_HOSTS: Array<[string, ArtistPlatform]> = [
  ['open.spotify.com', 'spotify'],
  ['music.apple.com', 'appleMusic'],
  ['bandcamp.com', 'bandcamp'],
  ['soundcloud.com', 'soundcloud'],
];

export const musicbrainzCache = new TtlCache<Lookup<unknown>>(TTL_MS);
const flight = createSingleFlight<Lookup<unknown>>();
let nextSlotAt = 0;

async function waitForSlot(): Promise<void> {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextSlotAt);
  nextSlotAt = scheduledAt + MIN_INTERVAL_MS;
  const delay = scheduledAt - now;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}

/** A 404 is a definitive miss; any other failure is retried on the next call. */
async function fetchJson<T>(path: string): Promise<Lookup<T>> {
  await waitForSlot();

  let response: Response;
  try {
    response = await fetch(`${MUSICBRAINZ_API}${path}`, {
      headers: { 'User-Agent': env.OUTBOUND_USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    logger.warn('musicbrainz.network_error', { path, message: (err as Error).message });
    return { status: 'failed' };
  }

  if (response.status === 404) return { status: 'none' };
  if (!response.ok) {
    logger.warn('musicbrainz.upstream_error', { path, status: response.status });
    return { status: 'failed' };
  }
  return { status: 'found', value: (await response.json()) as T };
}

async function cached<V>(key: string, load: () => Promise<Lookup<V>>): Promise<Lookup<V>> {
  const hit = musicbrainzCache.get(key);
  if (hit !== undefined) return hit as Lookup<V>;

  return (await flight(key, async () => {
    const result = await load();
    if (result.status !== 'failed') {
      musicbrainzCache.set(key, result, result.status === 'none' ? NEGATIVE_TTL_MS : undefined);
    }
    return result;
  })) as Lookup<V>;
}

/**
 * The MusicBrainz artist whose page declares this Deezer artist. Bound by that
 * link, never by name: homonyms are common (nine artists are called Cassius).
 */
export function findMbidByDeezerId(deezerId: string): Promise<Lookup<string>> {
  return cached(`deezer:${deezerId}`, async () => {
    const resource = `https://www.deezer.com/artist/${deezerId}`;
    const fetched = await fetchJson<{ relations?: Array<{ artist?: { id?: string } }> }>(
      `/url?resource=${encodeURIComponent(resource)}&inc=artist-rels&fmt=json`
    );
    if (fetched.status !== 'found') return fetched;

    const ids = new Set(
      (fetched.value.relations ?? []).flatMap((relation) =>
        relation.artist?.id ? [relation.artist.id] : []
      )
    );
    const [only] = ids;
    // Two artists sharing one Deezer page: none of them is the artist for sure.
    return ids.size === 1 && only ? { status: 'found', value: only } : { status: 'none' };
  });
}

interface RawArea {
  name?: string;
  'iso-3166-1-codes'?: string[];
}

interface RawArtist {
  type?: string | null;
  area?: RawArea | null;
  'begin-area'?: RawArea | null;
  'life-span'?: { begin?: string | null; end?: string | null; ended?: boolean };
  relations?: Array<{ type?: string; url?: { resource?: string } }>;
}

function year(date: string | null | undefined): number | null {
  const parsed = date ? Number.parseInt(date.slice(0, 4), 10) : Number.NaN;
  return Number.isNaN(parsed) ? null : parsed;
}

function countryOf(area: RawArea | null | undefined): string | null {
  return area?.['iso-3166-1-codes']?.[0] ?? null;
}

function toFacts(raw: RawArtist): ArtistFacts {
  const kind = KINDS[raw.type ?? ''] ?? null;
  const isPerson = kind === 'person';
  // A person's life-span and begin area are a birth, not a career: their
  // place is the area they are identified with.
  const placeArea = isPerson ? raw.area : raw['begin-area'];
  const place = placeArea?.name && !countryOf(placeArea) ? placeArea.name : null;
  return {
    kind,
    place,
    country: countryOf(raw.area) ?? (isPerson ? null : countryOf(raw['begin-area'])),
    formed: isPerson ? null : year(raw['life-span']?.begin),
    ended: isPerson ? null : year(raw['life-span']?.end),
    active: !isPerson && raw['life-span']?.ended === false,
  };
}

function platformOf(url: URL, relationType: string): ArtistPlatform | null {
  if (relationType === 'official homepage') return 'official';
  const host = url.hostname;
  const entry = LINK_HOSTS.find(([suffix]) => host === suffix || host.endsWith(`.${suffix}`));
  return entry ? entry[1] : null;
}

/** One link per platform, https only. */
function toLinks(raw: RawArtist): ArtistLink[] {
  const links = new Map<ArtistPlatform, string>();
  for (const relation of raw.relations ?? []) {
    const resource = relation.url?.resource;
    if (!resource?.startsWith('https://')) continue;
    const platform = platformOf(new URL(resource), relation.type ?? '');
    if (platform && !links.has(platform)) links.set(platform, resource);
  }
  return LINK_ORDER.flatMap((platform) => {
    const url = links.get(platform);
    return url ? [{ platform, url }] : [];
  });
}

function wikidataIdOf(raw: RawArtist): string | null {
  const resource = raw.relations?.find((relation) => relation.type === 'wikidata')?.url?.resource;
  const id = resource?.split('/').pop();
  return id && /^Q\d+$/.test(id) ? id : null;
}

export function getArtistByMbid(mbid: string): Promise<Lookup<MusicBrainzArtist>> {
  return cached(`artist:${mbid}`, async () => {
    const fetched = await fetchJson<RawArtist>(
      `/artist/${encodeURIComponent(mbid)}?inc=url-rels&fmt=json`
    );
    if (fetched.status !== 'found') return fetched;
    return {
      status: 'found',
      value: {
        facts: toFacts(fetched.value),
        links: toLinks(fetched.value),
        wikidataId: wikidataIdOf(fetched.value),
      },
    };
  });
}

/** Test seam: the throttle is module state and would slow every later test. */
export function __resetMusicbrainzThrottle(): void {
  nextSlotAt = 0;
}
