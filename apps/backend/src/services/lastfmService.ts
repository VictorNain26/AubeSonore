import { env } from '../config/env';
import { TtlCache } from '../lib/cache/ttlCache';

interface ArtistInfo {
  bio: string;
  tags: string[];
  similarArtists: string[];
  listeners: number;
}

// Real artist data is stable; cache it for a day.
const POSITIVE_TTL_MS = 24 * 60 * 60 * 1000;
// "Not found" is the long-term truth for misspellings/unknown artists.
const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000;

export const lastfmCache = new TtlCache<ArtistInfo | null>(POSITIVE_TTL_MS);

export async function getArtistInfo(name: string): Promise<ArtistInfo | null> {
  const cacheKey = name.toLowerCase();
  const cached = lastfmCache.get(cacheKey);
  if (cached !== undefined) return cached;

  if (!env.LASTFM_API_KEY) {
    console.warn('[LastFM] No API key configured');
    return null;
  }

  let response: Response;
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${env.LASTFM_API_KEY}&format=json&lang=fr`;
    response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  } catch (err) {
    // Network / timeout / abort: do NOT cache. Last.fm comes back online,
    // the next call should retry instead of returning stale null for 24h.
    console.warn('[LastFM] Transient network error:', (err as Error).message);
    return null;
  }

  if (response.status === 404 || response.status === 400) {
    // Authoritative "not found" — safe to cache with a shorter TTL than success.
    lastfmCache.set(cacheKey, null, NEGATIVE_TTL_MS);
    return null;
  }
  if (!response.ok) {
    // 5xx, 429, etc. — server problem, don't cache the failure.
    console.warn('[LastFM] Non-OK response:', response.status);
    return null;
  }

  const data = (await response.json()) as {
    artist?: {
      bio?: { summary?: string };
      tags?: { tag?: { name: string }[] };
      similar?: { artist?: { name: string }[] };
      stats?: { listeners?: string };
    };
  };
  const artist = data?.artist;

  if (!artist) {
    lastfmCache.set(cacheKey, null, NEGATIVE_TTL_MS);
    return null;
  }

  const info: ArtistInfo = {
    bio: cleanBio(artist.bio?.summary || ''),
    tags: (artist.tags?.tag || []).slice(0, 5).map((t: { name: string }) => t.name),
    similarArtists: (artist.similar?.artist || []).slice(0, 5).map((a: { name: string }) => a.name),
    listeners: parseInt(artist.stats?.listeners || '0', 10),
  };

  lastfmCache.set(cacheKey, info);
  return info;
}

function cleanBio(bio: string): string {
  // Remove Last.fm attribution link
  return bio.replace(/<a\s+href="[^"]*">.*?<\/a>\.?/gi, '').trim();
}
