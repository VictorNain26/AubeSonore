import { useCallback } from 'react';
import { toast } from 'sonner';
import { useLikedTracksStore } from '../../stores/likedTracksStore';
import { useAuthStore } from '../../stores/authStore';
import { useAuthModalStore } from '../../stores/authModalStore';

// Encapsulates the like / unlike flow used by both TrackArtwork (current
// track) and StationLog (previously played). Guards against:
// - unauthenticated users (opens the shared auth modal)
// - double-click on the same track (likingTrackId lock — lives in the
//   store so concurrent instances of this hook share the same lock)
// - duplicate row in the liked list (lookup by case-insensitive title+artist)

interface UseLikeAction {
  likingTrackId: string | null;
  toggleLike: (title: string, artist: string, artworkUrl?: string) => Promise<void>;
}

export function useLikeAction(): UseLikeAction {
  const likeTrack = useLikedTracksStore((s) => s.likeTrack);
  const unlikeTrack = useLikedTracksStore((s) => s.unlikeTrack);
  const tracks = useLikedTracksStore((s) => s.tracks);
  const likingTrackId = useLikedTracksStore((s) => s.likingTrackId);
  const setLikingTrackId = useLikedTracksStore((s) => s.setLikingTrackId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuthModal = useAuthModalStore((s) => s.open);

  const toggleLike = useCallback(
    async (title: string, artist: string, artworkUrl?: string): Promise<void> => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }

      const trackKey = `${title}-${artist}`;
      // Read the latest value from the store (not the subscribed selector)
      // so back-to-back synchronous calls see the lock set by the first.
      if (useLikedTracksStore.getState().likingTrackId === trackKey) return;

      setLikingTrackId(trackKey);
      try {
        const existingTrack = tracks.find(
          (t) =>
            t.title.toLowerCase() === title.toLowerCase() &&
            t.artist.toLowerCase() === artist.toLowerCase()
        );

        if (existingTrack) {
          const success = await unlikeTrack(existingTrack.id);
          if (success) {
            toast.success('Retiré de votre bibliothèque');
          }
        } else {
          const requestData: Parameters<typeof likeTrack>[0] = {
            title,
            artist,
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`)}`,
          };
          if (artworkUrl) {
            requestData.artworkUrl = artworkUrl;
          }
          await likeTrack(requestData);
          toast.success('Ajouté à votre bibliothèque');
        }
      } finally {
        setLikingTrackId(null);
      }
    },
    [likeTrack, unlikeTrack, tracks, isAuthenticated, openAuthModal, setLikingTrackId]
  );

  return { likingTrackId, toggleLike };
}
