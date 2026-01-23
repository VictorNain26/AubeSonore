import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';

import { useAuthStore } from '../stores/authStore';
import { useLikedTracksStore } from '../stores/likedTracksStore';
import type { Song } from '../types/azuracast';

interface UseLikeToggleOptions {
  /** Custom haptic feedback on toggle (default: Light) */
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  /** Redirect to auth if not authenticated (default: true) */
  redirectToAuth?: boolean;
}

interface UseLikeToggleReturn {
  /** Whether the current song is liked */
  isLiked: boolean;
  /** Whether a like operation is in progress */
  isLoading: boolean;
  /** Toggle like status for the current song */
  toggleLike: () => Promise<void>;
  /** Like a specific track by title/artist */
  likeByInfo: (title: string, artist: string, art?: string) => Promise<void>;
  /** Unlike a specific track by title/artist */
  unlikeByInfo: (title: string, artist: string) => Promise<void>;
}

/**
 * Hook for managing track like/unlike functionality.
 * Consolidates duplicate logic from MiniPlayer, player.tsx, and history.tsx.
 *
 * @param song - The song object to check/toggle like status
 * @param options - Configuration options
 */
export function useLikeToggle(
  song: Song | null | undefined,
  options: UseLikeToggleOptions = {}
): UseLikeToggleReturn {
  const { hapticStyle = Haptics.ImpactFeedbackStyle.Light, redirectToAuth = true } = options;

  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { isTrackLiked, likeTrack, unlikeTrack, tracks, isLoading } = useLikedTracksStore(
    useShallow((s) => ({
      isTrackLiked: s.isTrackLiked,
      likeTrack: s.likeTrack,
      unlikeTrack: s.unlikeTrack,
      tracks: s.tracks,
      isLoading: s.isLoading,
    }))
  );

  const isLiked = song ? isTrackLiked(song.title, song.artist) : false;

  const findExistingTrack = useCallback(
    (title: string, artist: string) => {
      return tracks.find(
        (t) =>
          t.title.toLowerCase() === title.toLowerCase() &&
          t.artist.toLowerCase() === artist.toLowerCase()
      );
    },
    [tracks]
  );

  const likeByInfo = useCallback(
    async (title: string, artist: string, art?: string) => {
      if (!isAuthenticated) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (redirectToAuth) {
          router.push('/auth');
        }
        return;
      }

      Haptics.impactAsync(hapticStyle);

      await likeTrack({
        title,
        artist,
        artworkUrl: art,
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`)}`,
      });
    },
    [isAuthenticated, redirectToAuth, router, hapticStyle, likeTrack]
  );

  const unlikeByInfo = useCallback(
    async (title: string, artist: string) => {
      if (!isAuthenticated) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (redirectToAuth) {
          router.push('/auth');
        }
        return;
      }

      Haptics.impactAsync(hapticStyle);

      const existingTrack = findExistingTrack(title, artist);
      if (existingTrack) {
        await unlikeTrack(existingTrack.id);
      }
    },
    [isAuthenticated, redirectToAuth, router, hapticStyle, findExistingTrack, unlikeTrack]
  );

  const toggleLike = useCallback(async () => {
    if (!song) return;

    if (!isAuthenticated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (redirectToAuth) {
        router.push('/auth');
      }
      return;
    }

    Haptics.impactAsync(hapticStyle);

    const { title, artist, art } = song;
    const existingTrack = findExistingTrack(title, artist);

    if (existingTrack) {
      await unlikeTrack(existingTrack.id);
    } else {
      await likeTrack({
        title,
        artist,
        artworkUrl: art,
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`)}`,
      });
    }
  }, [
    song,
    isAuthenticated,
    redirectToAuth,
    router,
    hapticStyle,
    findExistingTrack,
    likeTrack,
    unlikeTrack,
  ]);

  return {
    isLiked,
    isLoading,
    toggleLike,
    likeByInfo,
    unlikeByInfo,
  };
}
