import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useLikedTracksContext as useLikedTracks } from '../../contexts/LikedTracksContext';
import { useAuth } from '../../contexts/AuthContext';

// Encapsulates the like / unlike flow used by both AlbumArt (current track)
// and HistoryItem (previously played). Guards against:
// - unauthenticated users (opens the auth modal)
// - double-click on the same track (likingTrackId lock)
// - duplicate row in the liked list (lookup by case-insensitive title+artist)

interface UseLikeAction {
  likingTrackId: string | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  toggleLike: (title: string, artist: string, artworkUrl?: string) => Promise<void>;
}

export function useLikeAction(): UseLikeAction {
  const { likeTrack, unlikeTrack, tracks } = useLikedTracks();
  const { isAuthenticated } = useAuth();
  const [likingTrackId, setLikingTrackId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const toggleLike = useCallback(
    async (title: string, artist: string, artworkUrl?: string): Promise<void> => {
      if (!isAuthenticated) {
        setIsAuthModalOpen(true);
        return;
      }

      const trackKey = `${title}-${artist}`;
      if (likingTrackId === trackKey) return;

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
    [likeTrack, unlikeTrack, tracks, likingTrackId, isAuthenticated]
  );

  return { likingTrackId, isAuthModalOpen, setIsAuthModalOpen, toggleLike };
}
