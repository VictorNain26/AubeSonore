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
 * Récupère les liens multi-plateformes pour un morceau
 * @param url - URL du morceau (YouTube, Spotify, etc.)
 * @returns Liens vers toutes les plateformes disponibles
 */
export async function getSonglinkData(url: string): Promise<SonglinkResult | null> {
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

/**
 * Recherche un morceau par titre et artiste sur Songlink
 * Utilise une recherche YouTube comme proxy
 * @param title - Titre du morceau
 * @param artist - Nom de l'artiste
 */
export async function searchSonglink(_title: string, _artist: string): Promise<SonglinkResult | null> {
  // Songlink ne supporte pas la recherche directe
  // On pourrait implémenter une recherche YouTube puis utiliser getSonglinkData
  // Pour l'instant, on retourne null - le frontend devra fournir une URL
  console.warn('[Songlink] Recherche par titre/artiste non implémentée');
  return null;
}
