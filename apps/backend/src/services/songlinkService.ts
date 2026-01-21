import type { PlatformLinks } from '../db/schema';

// ─────────────────────────────────────────────
// Songlink/Odesli API Service
// API gratuite pour récupérer les liens multi-plateformes
// Documentation: https://odesli.co/
// ─────────────────────────────────────────────

const SONGLINK_API_BASE = 'https://api.song.link/v1-alpha.1/links';

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
 * Récupère les liens multi-plateformes à partir d'une URL de plateforme
 * Usage interne uniquement - utiliser searchSonglink() pour la recherche par titre/artiste
 */
async function getSonglinkData(url: string): Promise<SonglinkResult | null> {
  try {
    const encodedUrl = encodeURIComponent(url);
    const response = await fetch(`${SONGLINK_API_BASE}?url=${encodedUrl}&userCountry=FR`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Songlink] Morceau non trouvé pour: ${url}`);
        return null;
      }
      throw new Error(`Songlink API error: ${response.status}`);
    }

    const data = (await response.json()) as SonglinkResponse;

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

    // Build result with conditional metadata
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
  } catch (error) {
    console.error('[Songlink] Erreur lors de la récupération des liens:', error);
    return null;
  }
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
 * Recherche un morceau sur iTunes Search API
 * Doc: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */
async function searchItunes(title: string, artist: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${title} ${artist}`);
    const response = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1&country=FR`
    );

    if (!response.ok) {
      console.warn(`[iTunes] API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as ItunesSearchResponse;

    if (data.resultCount > 0 && data.results[0]?.trackViewUrl) {
      console.log(`[iTunes] Found: ${data.results[0].trackName} by ${data.results[0].artistName}`);
      return data.results[0].trackViewUrl;
    }

    console.warn(`[iTunes] No results for: ${title} - ${artist}`);
    return null;
  } catch (error) {
    console.error('[iTunes] Search error:', error);
    return null;
  }
}

/**
 * Recherche un morceau par titre et artiste
 * Utilise iTunes pour trouver l'URL Apple Music, puis Songlink pour les autres plateformes
 * @param title - Titre du morceau
 * @param artist - Nom de l'artiste
 */
export async function searchSonglink(
  title: string,
  artist: string
): Promise<SonglinkResult | null> {
  // Étape 1: Chercher sur iTunes pour obtenir une vraie URL
  const appleMusicUrl = await searchItunes(title, artist);

  if (!appleMusicUrl) {
    console.warn(`[Songlink] Could not find track on iTunes: ${title} - ${artist}`);
    return null;
  }

  // Étape 2: Passer l'URL Apple Music à Songlink
  console.log(`[Songlink] Resolving links from Apple Music URL: ${appleMusicUrl}`);
  return getSonglinkData(appleMusicUrl);
}
