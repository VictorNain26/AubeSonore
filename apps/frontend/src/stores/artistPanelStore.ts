import { create } from 'zustand';

// openNonce increments on every open() so the panel container can reset its
// local "browsing a similar artist" state even when the same artist is
// reopened (artistName alone wouldn't change in that case).

interface ArtistPanelState {
  artistName: string | null;
  openNonce: number;
  open: (artistName: string) => void;
  close: () => void;
}

export const useArtistPanelStore = create<ArtistPanelState>((set) => ({
  artistName: null,
  openNonce: 0,
  open: (artistName) => set((s) => ({ artistName, openNonce: s.openNonce + 1 })),
  close: () => set({ artistName: null }),
}));
