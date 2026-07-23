import type { PlatformLinks, PreferredPlatform } from '@aubesonore/shared-types/client';

export interface ShareableTrack {
  title: string;
  artist: string;
  youtubeUrl?: string;
  songlinkUrl?: string | null;
  platformLinks?: PlatformLinks | null;
}

/**
 * Returns the direct platform link for a track on the user's preferred
 * platform, falling back to any other real platform link. Returns `null`
 * when no real platform link exists yet — callers disable open/share instead
 * of surfacing a search URL or a third-party song.link page.
 */
export function getPlatformLink(
  track: ShareableTrack,
  preferredPlatform: PreferredPlatform
): string | null {
  if (!track.platformLinks) return null;
  const platformKey = preferredPlatform === 'youtube' ? 'youtubeMusic' : preferredPlatform;
  const preferred = track.platformLinks[platformKey];
  if (preferred) return preferred;
  const firstAvailable = (Object.values(track.platformLinks) as Array<string | undefined>).find(
    Boolean
  );
  return firstAvailable ?? null;
}

/**
 * Returns the best listening URL for sharing a track from the now-playing
 * surface (player / recent rail), where links are not yet resolved in DB.
 * Priority: preferred platform link > any platform link > songlinkUrl > youtubeUrl > YouTube search.
 */
export function getTrackShareUrl(
  track: ShareableTrack,
  preferredPlatform?: PreferredPlatform | null
): string {
  // Try preferred platform link
  if (track.platformLinks && preferredPlatform) {
    const platformKey = preferredPlatform === 'youtube' ? 'youtubeMusic' : preferredPlatform;
    const preferred = track.platformLinks[platformKey];
    if (preferred) return preferred;
  }

  // Try any available platform link
  if (track.platformLinks) {
    const firstLink = (Object.values(track.platformLinks) as Array<string | undefined>).find(
      Boolean
    );
    if (firstLink) return firstLink;
  }

  // Fall back to songlink
  if (track.songlinkUrl) return track.songlinkUrl;

  // Fall back to youtubeUrl
  if (track.youtubeUrl) return track.youtubeUrl;

  // Last resort: YouTube search
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.artist} - ${track.title}`)}`;
}
