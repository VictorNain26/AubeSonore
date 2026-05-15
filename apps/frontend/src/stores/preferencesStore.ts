import { create } from 'zustand';
import { preferencesApi, type UserPreferences, type PreferredPlatform } from '../lib/api';

// User preferences (currently: preferredPlatform), out of React Context.
// Auth-driven refresh/clear is wired by <AuthDataSync /> — this store is
// auth-agnostic.

interface PreferencesState {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
}

interface PreferencesActions {
  refresh: () => Promise<void>;
  clear: () => void;
  updatePlatform: (platform: PreferredPlatform) => Promise<boolean>;
}

type PreferencesStore = PreferencesState & PreferencesActions;

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  preferences: null,
  isLoading: false,
  error: null,

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await preferencesApi.getPreferences();
      set({ preferences: data, isLoading: false });
    } catch {
      set({ preferences: null, isLoading: false });
    }
  },

  clear: () => {
    set({ preferences: null, error: null });
  },

  updatePlatform: async (platform) => {
    try {
      const result = await preferencesApi.updatePreferences(platform);
      set({ preferences: result.preferences });
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur lors de la mise à jour' });
      return false;
    }
  },
}));
