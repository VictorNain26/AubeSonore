import { create } from 'zustand';
import { trackApi } from '../services/api';
import type { LikedTrack, LikeTrackRequest } from '../types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface LikedTracksState {
  tracks: LikedTrack[];
  isLoading: boolean;
  error: string | null;
}

interface LikedTracksActions {
  fetchTracks: () => Promise<void>;
  likeTrack: (data: LikeTrackRequest) => Promise<LikedTrack | null>;
  unlikeTrack: (trackId: string) => Promise<boolean>;
  checkLiked: (title: string, artist: string) => Promise<LikedTrack | null>;
  isTrackLiked: (title: string, artist: string) => boolean;
  refreshLinks: (trackId: string) => Promise<LikedTrack | null>;
  clearTracks: () => void;
  clearError: () => void;
}

type LikedTracksStore = LikedTracksState & LikedTracksActions;

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useLikedTracksStore = create<LikedTracksStore>((set, get) => ({
  tracks: [],
  isLoading: false,
  error: null,

  fetchTracks: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await trackApi.getLikedTracks();
      set({ tracks: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur de chargement',
        isLoading: false,
      });
    }
  },

  likeTrack: async (data: LikeTrackRequest): Promise<LikedTrack | null> => {
    // Create temporary track for optimistic update
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

    // Optimistic update
    set((state) => ({
      tracks: [...state.tracks, optimisticTrack],
    }));

    try {
      const result = await trackApi.likeTrack(data);
      // Replace temp track with real one
      set((state) => ({
        tracks: state.tracks.map((t) => (t.id === tempId ? result.track : t)),
      }));
      return result.track;
    } catch (err) {
      // Rollback on error
      set((state) => ({
        tracks: state.tracks.filter((t) => t.id !== tempId),
        error: err instanceof Error ? err.message : 'Erreur lors du like',
      }));
      return null;
    }
  },

  unlikeTrack: async (trackId: string): Promise<boolean> => {
    const { tracks } = get();
    const trackToRemove = tracks.find((t) => t.id === trackId);
    const previousIndex = tracks.findIndex((t) => t.id === trackId);

    // Optimistic update
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== trackId),
    }));

    try {
      await trackApi.unlikeTrack(trackId);
      return true;
    } catch (err) {
      // Rollback on error
      if (trackToRemove) {
        set((state) => {
          const newTracks = [...state.tracks];
          newTracks.splice(previousIndex, 0, trackToRemove);
          return {
            tracks: newTracks,
            error: err instanceof Error ? err.message : 'Erreur lors de la suppression',
          };
        });
      }
      return false;
    }
  },

  checkLiked: async (title: string, artist: string): Promise<LikedTrack | null> => {
    try {
      const result = await trackApi.checkLiked({ title, artist });
      return result.track || null;
    } catch {
      return null;
    }
  },

  isTrackLiked: (title: string, artist: string): boolean => {
    const { tracks } = get();
    return tracks.some(
      (t) =>
        t.title.toLowerCase() === title.toLowerCase() &&
        t.artist.toLowerCase() === artist.toLowerCase()
    );
  },

  refreshLinks: async (trackId: string): Promise<LikedTrack | null> => {
    try {
      const result = await trackApi.refreshLinks(trackId);
      // Update track in the list
      set((state) => ({
        tracks: state.tracks.map((t) => (t.id === trackId ? result.track : t)),
      }));
      return result.track;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur lors du refresh',
      });
      return null;
    }
  },

  clearTracks: () => set({ tracks: [], error: null }),

  clearError: () => set({ error: null }),
}));
