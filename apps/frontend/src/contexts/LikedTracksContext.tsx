import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { trackApi, type LikedTrack, type LikeTrackRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const prevAuthRef = useRef<boolean | null>(null);

  // Charger les morceaux likés (seulement si authentifié)
  const refreshTracks = useCallback(async () => {
    if (!isAuthenticated) {
      setTracks([]);
      setIsLoading(false);
      return;
    }
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
  }, [isAuthenticated]);

  // Réagir aux changements d'authentification
  useEffect(() => {
    // Attendre que l'auth soit chargée
    if (authLoading) return;

    // Détecter les changements d'état d'auth
    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && wasAuthenticated !== true) {
      // Vient de se connecter -> charger les tracks
      refreshTracks();
    } else if (!isAuthenticated && wasAuthenticated === true) {
      // Vient de se déconnecter -> vider les tracks
      setTracks([]);
      setError(null);
    }
  }, [isAuthenticated, authLoading, refreshTracks]);

  // Liker un morceau - Optimistic update
  const likeTrack = useCallback(
    async (data: LikeTrackRequest): Promise<LikedTrack | null> => {
      if (!isAuthenticated) return null;

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
        setTracks((prev) => prev.map((t) => (t.id === tempId ? result.track : t)));
        return result.track;
      } catch (err) {
        // Rollback en cas d'erreur
        setTracks((prev) => prev.filter((t) => t.id !== tempId));
        setError(err instanceof Error ? err.message : 'Erreur lors du like');
        return null;
      }
    },
    [isAuthenticated]
  );

  // Supprimer un like - Optimistic update
  const unlikeTrack = useCallback(
    async (trackId: string): Promise<boolean> => {
      if (!isAuthenticated) return false;

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
    },
    [tracks, isAuthenticated]
  );

  // Vérifier si un morceau est liké (via API)
  const checkLiked = useCallback(
    async (title: string, artist: string): Promise<LikedTrack | null> => {
      if (!isAuthenticated) return null;

      try {
        const result = await trackApi.checkLiked({ title, artist });
        return result.track || null;
      } catch {
        return null;
      }
    },
    [isAuthenticated]
  );

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

  return <LikedTracksContext.Provider value={value}>{children}</LikedTracksContext.Provider>;
}

// Hook pour utiliser le context
export function useLikedTracksContext(): LikedTracksContextValue {
  const context = useContext(LikedTracksContext);
  if (!context) {
    throw new Error('useLikedTracksContext must be used within a LikedTracksProvider');
  }
  return context;
}
