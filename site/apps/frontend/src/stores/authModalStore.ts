import { create } from 'zustand';

// Shared "open the auth modal" trigger with optional mode + reset-token.
// All callers (header Connexion button, Like flow, Library button, URL
// reset-password handler) go through this store so a single
// <AuthModalHost /> at the app root owns the actual mount.

type AuthMode = 'signin' | 'signup';

interface AuthModalState {
  isOpen: boolean;
  mode: AuthMode;
  resetToken: string | null;
  /** Title the listener tried to keep before signing in (contextual heading). */
  keepTitle: string | null;
}

interface AuthModalActions {
  open: (options?: { mode?: AuthMode; resetToken?: string; keepTitle?: string }) => void;
  close: () => void;
}

export const useAuthModalStore = create<AuthModalState & AuthModalActions>((set) => ({
  isOpen: false,
  mode: 'signin',
  resetToken: null,
  keepTitle: null,

  open: (options) =>
    set({
      isOpen: true,
      mode: options?.mode ?? 'signin',
      resetToken: options?.resetToken ?? null,
      keepTitle: options?.keepTitle ?? null,
    }),
  close: () => set({ isOpen: false, mode: 'signin', resetToken: null, keepTitle: null }),
}));
