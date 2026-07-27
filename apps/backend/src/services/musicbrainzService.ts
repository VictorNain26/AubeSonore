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
// MusicBrainz caps anonymous clients at one request per second and bans
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
