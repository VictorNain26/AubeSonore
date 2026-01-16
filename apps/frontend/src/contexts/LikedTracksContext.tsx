import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { trackApi, type LikedTrack, type LikeTrackRequest } from '../lib/api';

// ─────────────────────────────────────────────
// Context pour partager l'état des tracks likés
// Pattern: Single source of truth pour tous les composants
// ─────────────────────────────────────────────

interface LikedTracksContextValue {
  tracks: LikedTrack[];
  isLoading: boolean;
  error: string | null;
  likeTrack: (data: LikeTrackRequest) => Promise<LikedTrack | null>;
  unlikeTrack: (trackId: string) => Promise<boolean>;
  checkLiked: (title: string, artist: string) => Promise<LikedTrack | null>;
  isTrackLiked: (title: string, artist: string) => boolean;
  refreshTracks: () => Promise<void>;
}

const LikedTracksContext = createContext<LikedTracksContextValue | null>(null);

interface LikedTracksProviderProps {
  children: ReactNode;
}

export function LikedTracksProvider({ children }: LikedTracksProviderProps) {
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

  // Liker un morceau - Optimistic update
  const likeTrack = useCallback(async (data: LikeTrackRequest): Promise<LikedTrack | null> => {
    // Créer un track temporaire pour affichage immédiat
    const tempId = `temp-${Date.now()}`;
    const optimisticTrack: LikedTrack = {
      id: tempId,
      userId: '',
      title: data.title,
      artist: data.artist,
      album: null,
      artworkUrl: data.artworkUrl || null,
      artworkBase64: null,
      youtubeUrl: data.youtubeUrl,
      isrc: null,
      songlinkUrl: null,
      platformLinks: null,
      createdAt: new Date().toISOString(),
    };

    // Ajouter immédiatement à l'UI (optimistic)
    setTracks((prev) => [...prev, optimisticTrack]);

    try {
      const result = await trackApi.likeTrack(data);
      // Remplacer le track temporaire par le vrai
      setTracks((prev) =>
        prev.map((t) => (t.id === tempId ? result.track : t))
      );
      return result.track;
    } catch (err) {
      // Rollback en cas d'erreur
      setTracks((prev) => prev.filter((t) => t.id !== tempId));
      setError(err instanceof Error ? err.message : 'Erreur lors du like');
      return null;
    }
  }, []);

  // Supprimer un like - Optimistic update
  const unlikeTrack = useCallback(async (trackId: string): Promise<boolean> => {
    // Sauvegarder pour rollback potentiel
    const trackToRemove = tracks.find((t) => t.id === trackId);
    const previousIndex = tracks.findIndex((t) => t.id === trackId);

    // Retirer immédiatement de l'UI (optimistic)
    setTracks((prev) => prev.filter((t) => t.id !== trackId));

    try {
      await trackApi.unlikeTrack(trackId);
      return true;
    } catch (err) {
      // Rollback: remettre le track à sa position
      if (trackToRemove) {
        setTracks((prev) => {
          const newTracks = [...prev];
          newTracks.splice(previousIndex, 0, trackToRemove);
          return newTracks;
        });
      }
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  }, [tracks]);

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

  const value: LikedTracksContextValue = {
    tracks,
    isLoading,
    error,
    likeTrack,
    unlikeTrack,
    checkLiked,
    isTrackLiked,
    refreshTracks,
  };

  return (
    <LikedTracksContext.Provider value={value}>
      {children}
    </LikedTracksContext.Provider>
  );
}

// Hook pour utiliser le context
export function useLikedTracksContext(): LikedTracksContextValue {
  const context = useContext(LikedTracksContext);
  if (!context) {
    throw new Error('useLikedTracksContext must be used within a LikedTracksProvider');
  }
  return context;
}
