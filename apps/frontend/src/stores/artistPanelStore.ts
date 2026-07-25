import { create } from 'zustand';

interface ArtistPanelState {
  artistName: string | null;
  open: (artistName: string) => void;
  close: () => void;
}

export const useArtistPanelStore = create<ArtistPanelState>((set) => ({
  artistName: null,
  open: (artistName) => set({ artistName }),
  close: () => set({ artistName: null }),
}));
