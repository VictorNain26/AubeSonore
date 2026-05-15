import { create } from 'zustand';

// Shared "open the auth modal" trigger. Both the Like flow (when the
// user clicks like while unauthenticated) and the Library button (when
// the user clicks the library icon while unauthenticated) need to open
// the same modal. A tiny Zustand store keeps the trigger out of the
// render tree so no parent has to host the state on their behalf.

interface AuthModalStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useAuthModalStore = create<AuthModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
