import { env } from '../config/env';
import { TtlCache } from '../lib/cache/ttlCache';

interface ArtistInfo {
  bio: string;
  tags: string[];
  similarArtists: string[];
  listeners: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;
export const lastfmCache = new TtlCache<ArtistInfo | null>(TTL_MS);

export async function getArtistInfo(name: string): Promise<ArtistInfo | null> {
  const cacheKey = name.toLowerCase();
  const cached = lastfmCache.get(cacheKey);
  if (cached !== undefined) return cached;

  if (!env.LASTFM_API_KEY) {
    console.warn('[LastFM] No API key configured');
    return null;
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${env.LASTFM_API_KEY}&format=json&lang=fr`;

    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      artist?: {
        bio?: { summary?: string };
        tags?: { tag?: { name: string }[] };
        similar?: { artist?: { name: string }[] };
        stats?: { listeners?: string };
      };
    };
    const artist = data?.artist;

    if (!artist) return null;

    const info: ArtistInfo = {
      bio: cleanBio(artist.bio?.summary || ''),
      tags: (artist.tags?.tag || []).slice(0, 5).map((t: { name: string }) => t.name),
      similarArtists: (artist.similar?.artist || [])
        .slice(0, 5)
        .map((a: { name: string }) => a.name),
      listeners: parseInt(artist.stats?.listeners || '0', 10),
    };

    lastfmCache.set(cacheKey, info);
    return info;
  } catch (err) {
    console.error('[LastFM] Error fetching artist info:', (err as Error).message);
    lastfmCache.set(cacheKey, null);
    return null;
  }
}

function cleanBio(bio: string): string {
  // Remove Last.fm attribution link
  return bio.replace(/<a\s+href="[^"]*">.*?<\/a>\.?/gi, '').trim();
}
