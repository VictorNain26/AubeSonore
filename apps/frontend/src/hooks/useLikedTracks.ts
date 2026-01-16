import { useState, useEffect, useCallback } from 'react';
import { trackApi, type LikedTrack, type LikeTrackRequest } from '../lib/api';

// ─────────────────────────────────────────────
// Hook pour gérer les morceaux likés
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
  const [tracks, setTracks] = useState<LikedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les morceaux likés au montage
  const refreshTracks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await trackApi.getLikedTracks();
      setTracks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTracks();
  }, [refreshTracks]);

  // Liker un morceau
  const likeTrack = useCallback(async (data: LikeTrackRequest): Promise<LikedTrack | null> => {
    try {
      const result = await trackApi.likeTrack(data);
      setTracks((prev) => [...prev, result.track]);
      return result.track;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du like');
      return null;
    }
  }, []);

  // Supprimer un like
  const unlikeTrack = useCallback(async (trackId: string): Promise<boolean> => {
    try {
      await trackApi.unlikeTrack(trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  }, []);

  // Vérifier si un morceau est liké (via API)
  const checkLiked = useCallback(async (title: string, artist: string): Promise<LikedTrack | null> => {
    try {
      const result = await trackApi.checkLiked({ title, artist });
      return result.track || null;
    } catch {
      return null;
    }
  }, []);

  // Vérifier si un morceau est liké (via cache local)
  const isTrackLiked = useCallback(
    (title: string, artist: string): boolean => {
      return tracks.some(
        (t) =>
          t.title.toLowerCase() === title.toLowerCase() &&
          t.artist.toLowerCase() === artist.toLowerCase()
      );
    },
    [tracks]
  );

  return {
    tracks,
    isLoading,
    error,
    likeTrack,
    unlikeTrack,
    checkLiked,
    isTrackLiked,
    refreshTracks,
  };
}
