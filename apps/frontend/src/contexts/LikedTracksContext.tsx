import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { trackApi, type LikedTrack, type LikeTrackRequest } from '../lib/api';
import { useAuth } from './AuthContext';

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
  isTrackLiked: (title: string, artist: string) => boolean;
  refreshTracks: () => Promise<void>;
}

const LikedTracksContext = createContext<LikedTracksContextValue | null>(null);

interface LikedTracksProviderProps {
  children: ReactNode;
}

export function LikedTracksProvider({ children }: LikedTracksProviderProps) {
  const [tracks, setTracks] = useState<LikedTrack[]>([]);
  // Mirror `tracks` in a ref so callbacks can read the latest value
  // synchronously without depending on `tracks` (which would invalidate the
  // memo'd context value on every change and cascade re-renders to all
  // consumers — Player, AlbumArt, history items, modal).
  const tracksRef = useRef<LikedTrack[]>([]);
  useLayoutEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
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
      void refreshTracks();
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

  // Supprimer un like - Optimistic update.
  // Reads the current tracks via tracksRef so the callback identity stays
  // stable (deps = [isAuthenticated] only). React 19 may invoke setState
  // updaters twice in strict mode, so we capture the snapshot BEFORE the
  // optimistic removal, not inside the updater.
  const unlikeTrack = useCallback(
    async (trackId: string): Promise<boolean> => {
      if (!isAuthenticated) return false;

      const current = tracksRef.current;
      const previousIndex = current.findIndex((t) => t.id === trackId);
      const trackToRemove = previousIndex >= 0 ? current[previousIndex] : undefined;
      if (!trackToRemove) return false;

      setTracks((prev) => prev.filter((t) => t.id !== trackId));

      try {
        await trackApi.unlikeTrack(trackId);
        return true;
      } catch (err) {
        setTracks((prev) => {
          const newTracks = [...prev];
          newTracks.splice(previousIndex, 0, trackToRemove);
          return newTracks;
        });
        setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
        return false;
      }
    },
    [isAuthenticated]
  );

  // Memoized lowercase key set for O(1) lookup. Rebuilt only when tracks change.
  const trackKeys = useMemo(() => {
    const set = new Set<string>();
    for (const t of tracks) {
      set.add(`${t.title.toLowerCase()}${t.artist.toLowerCase()}`);
    }
    return set;
  }, [tracks]);

  const isTrackLiked = useCallback(
    (title: string, artist: string): boolean => {
      return trackKeys.has(`${title.toLowerCase()}${artist.toLowerCase()}`);
    },
    [trackKeys]
  );

  const value = useMemo<LikedTracksContextValue>(
    () => ({
      tracks,
      isLoading,
      error,
      likeTrack,
      unlikeTrack,
      isTrackLiked,
      refreshTracks,
    }),
    [tracks, isLoading, error, likeTrack, unlikeTrack, isTrackLiked, refreshTracks]
  );

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
