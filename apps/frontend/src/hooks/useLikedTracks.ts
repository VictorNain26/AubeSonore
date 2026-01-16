import { useLikedTracksContext } from '../contexts/LikedTracksContext';
import type { LikedTrack, LikeTrackRequest } from '../lib/api';

// ─────────────────────────────────────────────
// Hook pour gérer les morceaux likés
// Utilise le context pour partager l'état entre composants
// ─────────────────────────────────────────────

interface UseLikedTracksReturn {
  tracks: LikedTrack[];
  isLoading: boolean;
  error: string | null;
  likeTrack: (data: LikeTrackRequest) => Promise<LikedTrack | null>;
  unlikeTrack: (trackId: string) => Promise<boolean>;
  checkLiked: (title: string, artist: string) => Promise<LikedTrack | null>;
  isTrackLiked: (title: string, artist: string) => boolean;
  refreshTracks: () => Promise<void>;
}

export function useLikedTracks(): UseLikedTracksReturn {
  return useLikedTracksContext();
}
