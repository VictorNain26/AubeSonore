import { create } from 'zustand';
import { preferencesApi } from '../services/api';
import type { UserPreferences, PreferredPlatform } from '../types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PreferencesState {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
}

interface PreferencesActions {
  fetchPreferences: () => Promise<void>;
  updatePreferredPlatform: (platform: PreferredPlatform) => Promise<void>;
  clearPreferences: () => void;
}

type PreferencesStore = PreferencesState & PreferencesActions;

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  preferences: null,
  isLoading: false,
  error: null,

  fetchPreferences: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await preferencesApi.getPreferences();
      set({ preferences: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur de chargement',
        isLoading: false,
      });
    }
  },

  updatePreferredPlatform: async (platform: PreferredPlatform) => {
    try {
      set({ isLoading: true, error: null });
      const result = await preferencesApi.updatePreferences(platform);
      set({ preferences: result.preferences, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur de mise à jour',
        isLoading: false,
      });
    }
  },

  clearPreferences: () => set({ preferences: null, error: null }),
}));
