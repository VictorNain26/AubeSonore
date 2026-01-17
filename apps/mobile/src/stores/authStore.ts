import { create } from 'zustand';
import { authApi, getAuthToken, removeAuthToken } from '../services/api';
import type { User } from '../types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    const token = await getAuthToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    await get().refreshSession();
  },

  refreshSession: async () => {
    try {
      set({ isLoading: true });
      const session = await authApi.getSession();
      set({
        user: session?.user || null,
        isAuthenticated: !!session?.user,
        isLoading: false,
      });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    const response = await authApi.signIn(email, password);
    set({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  signUp: async (email: string, password: string, name: string) => {
    const response = await authApi.signUp(email, password, name);
    set({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  signOut: async () => {
    await authApi.signOut();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
