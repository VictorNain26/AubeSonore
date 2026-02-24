import type { PlatformLinks, PreferredPlatform } from '@aubesonore/shared-types/client';

export interface ShareableTrack {
  title: string;
  artist: string;
  youtubeUrl?: string;
  songlinkUrl?: string | null;
  platformLinks?: PlatformLinks | null;
}

/**
 * Returns a platform-specific search URL for a given query.
 */
export function getSearchUrl(platform: PreferredPlatform, query: string): string {
  const encoded = encodeURIComponent(query);
  const urls: Record<PreferredPlatform, string> = {
    spotify: `https://open.spotify.com/search/${encoded}`,
    appleMusic: `https://music.apple.com/search?term=${encoded}`,
    deezer: `https://www.deezer.com/search/${encoded}`,
    youtubeMusic: `https://music.youtube.com/search?q=${encoded}`,
    youtube: `https://www.youtube.com/results?search_query=${encoded}`,
    tidal: `https://listen.tidal.com/search?q=${encoded}`,
    amazonMusic: `https://music.amazon.com/search/${encoded}`,
    soundcloud: `https://soundcloud.com/search?q=${encoded}`,
  };
  return urls[platform];
}

/**
 * Returns the best link for opening a track on the user's preferred platform.
 * Falls back to any available link, then songlink, then a search URL.
 */
export function getPreferredLink(
  track: ShareableTrack,
  preferredPlatform: PreferredPlatform
): { url: string; isSearch: boolean } {
  if (track.platformLinks) {
    const platformKey = preferredPlatform === 'youtube' ? 'youtubeMusic' : preferredPlatform;
    const preferred = track.platformLinks[platformKey as keyof PlatformLinks];
    if (preferred) return { url: preferred, isSearch: false };

    const firstAvailable = Object.values(track.platformLinks).find(Boolean);
    if (firstAvailable) return { url: firstAvailable, isSearch: false };
  }

  if (track.songlinkUrl) return { url: track.songlinkUrl, isSearch: false };

  const query = `${track.title} ${track.artist}`;
  return { url: getSearchUrl(preferredPlatform, query), isSearch: true };
}

/**
 * Returns the best listening URL for sharing a track.
 * Priority: preferred platform link > any platform link > songlinkUrl > youtubeUrl > YouTube search
 */
export function getTrackShareUrl(
  track: ShareableTrack,
  preferredPlatform?: PreferredPlatform | null
): string {
  // Try preferred platform link
  if (track.platformLinks && preferredPlatform) {
    const platformKey = preferredPlatform === 'youtube' ? 'youtubeMusic' : preferredPlatform;
    const preferred = track.platformLinks[platformKey as keyof PlatformLinks];
    if (preferred) return preferred;
  }

  // Try any available platform link
  if (track.platformLinks) {
    const firstLink = Object.values(track.platformLinks).find(Boolean);
    if (firstLink) return firstLink;
  }

  // Fall back to songlink
  if (track.songlinkUrl) return track.songlinkUrl;

  // Fall back to youtubeUrl
  if (track.youtubeUrl) return track.youtubeUrl;

  // Last resort: YouTube search
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.artist} - ${track.title}`)}`;
}

/**
 * Builds a share message with the track info and listening link.
 */
export function buildShareText(
  track: ShareableTrack,
  preferredPlatform?: PreferredPlatform | null
): string {
  const url = getTrackShareUrl(track, preferredPlatform);
  return `${track.title} — ${track.artist}\n${url}`;
}
