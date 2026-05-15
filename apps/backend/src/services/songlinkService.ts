import type { PlatformLinks } from '../db/schema';
import { TtlCache } from '../lib/cache/ttlCache';
import { logger } from '../lib/logger';

// ─────────────────────────────────────────────
// Songlink/Odesli API Service
// API gratuite pour récupérer les liens multi-plateformes
// Documentation: https://odesli.co/
// ─────────────────────────────────────────────

const SONGLINK_API_BASE = 'https://api.song.link/v1-alpha.1/links';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const songlinkCache = new TtlCache<SonglinkResult | null>(SEVEN_DAYS_MS);
export const itunesCache = new TtlCache<string | null>(SEVEN_DAYS_MS);

interface SonglinkPlatform {
  url: string;
  entityUniqueId: string;
}

interface SonglinkEntity {
  id: string;
  type: string;
  title?: string;
  artistName?: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  apiProvider: string;
  platforms: string[];
}

interface SonglinkResponse {
  entityUniqueId: string;
  userCountry: string;
  pageUrl: string; // Lien universel Songlink
  linksByPlatform: {
    spotify?: SonglinkPlatform;
    appleMusic?: SonglinkPlatform;
    deezer?: SonglinkPlatform;
    youtubeMusic?: SonglinkPlatform;
    tidal?: SonglinkPlatform;
    amazonMusic?: SonglinkPlatform;
    soundcloud?: SonglinkPlatform;
    youtube?: SonglinkPlatform;
  };
  entitiesByUniqueId: Record<string, SonglinkEntity>;
}

export interface SonglinkResult {
  pageUrl: string;
  platformLinks: PlatformLinks;
  metadata?: {
    title?: string;
    artist?: string;
    thumbnailUrl?: string;
  };
}

/**
 * Récupère les liens multi-plateformes à partir d'une URL de plateforme.
 *
 * Convention erreurs (compte tenu du cache 7 jours qui pollue durablement) :
 * - `return null`  : résultat *définitif négatif* (404 = morceau pas dans Songlink) — sûr à mettre en cache.
 * - `throw`        : erreur *transitoire* (timeout, 5xx, réseau, JSON invalide) — le caller NE DOIT PAS la cacher.
 */
async function getSonglinkData(url: string): Promise<SonglinkResult | null> {
  let response: Response;
  try {
    const encodedUrl = encodeURIComponent(url);
    response = await fetch(`${SONGLINK_API_BASE}?url=${encodedUrl}&userCountry=FR`, {
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    // Network failure or AbortError (timeout). Transient — re-throw.
    logger.warn('songlink.network_error', {
      url,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  if (response.status === 404) {
    // Definitive: the song isn't in Songlink's index. Safe to cache.
    logger.info('songlink.not_found', { url });
    return null;
  }

  if (!response.ok) {
    // 5xx, rate-limit, etc. — transient, do NOT cache.
    logger.warn('songlink.upstream_error', { url, status: response.status });
    throw new Error(`Songlink API error: ${response.status}`);
  }

  let data: SonglinkResponse;
  try {
    data = (await response.json()) as SonglinkResponse;
  } catch (error) {
    logger.warn('songlink.invalid_json', {
      url,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  // Extraire les liens par plateforme
  const platformLinks: PlatformLinks = {};

  if (data.linksByPlatform.spotify?.url) {
    platformLinks.spotify = data.linksByPlatform.spotify.url;
  }
  if (data.linksByPlatform.appleMusic?.url) {
    platformLinks.appleMusic = data.linksByPlatform.appleMusic.url;
  }
  if (data.linksByPlatform.deezer?.url) {
    platformLinks.deezer = data.linksByPlatform.deezer.url;
  }
  if (data.linksByPlatform.youtubeMusic?.url) {
    platformLinks.youtubeMusic = data.linksByPlatform.youtubeMusic.url;
  }
  if (data.linksByPlatform.tidal?.url) {
    platformLinks.tidal = data.linksByPlatform.tidal.url;
  }
  if (data.linksByPlatform.amazonMusic?.url) {
    platformLinks.amazonMusic = data.linksByPlatform.amazonMusic.url;
  }
  if (data.linksByPlatform.soundcloud?.url) {
    platformLinks.soundcloud = data.linksByPlatform.soundcloud.url;
  }

  // Extraire les métadonnées depuis la première entité disponible
  const entities = Object.values(data.entitiesByUniqueId);
  const firstEntity = entities[0];

  const result: SonglinkResult = {
    pageUrl: data.pageUrl,
    platformLinks,
  };

  if (firstEntity) {
    const metadata: NonNullable<SonglinkResult['metadata']> = {};
    if (firstEntity.title) metadata.title = firstEntity.title;
    if (firstEntity.artistName) metadata.artist = firstEntity.artistName;
    if (firstEntity.thumbnailUrl) metadata.thumbnailUrl = firstEntity.thumbnailUrl;
    result.metadata = metadata;
  }

  return result;
}

interface ItunesSearchResponse {
  resultCount: number;
  results: Array<{
    trackViewUrl: string;
    trackName: string;
    artistName: string;
  }>;
}

/**
 * Recherche un morceau sur iTunes Search API.
 *
 * Même convention que `getSonglinkData` : succès et "0 results" cachés ;
 * erreurs transitoires (5xx, timeout) ne polluent pas le cache 7 jours.
 */
async function searchItunes(title: string, artist: string): Promise<string | null> {
  const cacheKey = `${title.toLowerCase()}|${artist.toLowerCase()}`;
  const cached = itunesCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let response: Response;
  try {
    const query = encodeURIComponent(`${title} ${artist}`);
    response = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1&country=FR`,
      { signal: AbortSignal.timeout(5_000) }
    );
  } catch (error) {
    logger.warn('itunes.network_error', {
      title,
      artist,
      message: error instanceof Error ? error.message : String(error),
    });
    return null; // Transient: don't cache, retry next call.
  }

  if (!response.ok) {
    logger.warn('itunes.upstream_error', { title, artist, status: response.status });
    return null; // Transient: don't cache.
  }

  let data: ItunesSearchResponse;
  try {
    data = (await response.json()) as ItunesSearchResponse;
  } catch (error) {
    logger.warn('itunes.invalid_json', {
      title,
      artist,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  if (data.resultCount > 0 && data.results[0]?.trackViewUrl) {
    const url = data.results[0].trackViewUrl;
    itunesCache.set(cacheKey, url);
    return url;
  }

  // 0 results = definitive negative. Cache 7 days.
  itunesCache.set(cacheKey, null);
  return null;
}

/**
 * Recherche un morceau par titre et artiste.
 * Utilise iTunes pour trouver l'URL Apple Music, puis Songlink pour les autres plateformes.
 *
 * Le cache stocke uniquement les résultats *définitifs* (success OR "not found").
 * Les échecs transitoires sont absorbés en retournant `null` sans empoisonner
 * le cache — le prochain appel retentera côté upstream.
 */
export async function searchSonglink(
  title: string,
  artist: string
): Promise<SonglinkResult | null> {
  const cacheKey = `${title.toLowerCase()}|${artist.toLowerCase()}`;
  const cached = songlinkCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const appleMusicUrl = await searchItunes(title, artist);
  if (!appleMusicUrl) {
    // iTunes returned null. Cache only when itunesCache itself confirmed
    // (transient itunes failure already returned null without caching, so
    // we cannot distinguish here — accept that a transient itunes miss will
    // also avoid the songlink cache write below).
    songlinkCache.set(cacheKey, null);
    return null;
  }

  try {
    const result = await getSonglinkData(appleMusicUrl);
    songlinkCache.set(cacheKey, result);
    return result;
  } catch {
    // Transient Songlink failure: do NOT cache, return null for this call only.
    logger.warn('songlink.transient_failure_uncached', { title, artist });
    return null;
  }
}
