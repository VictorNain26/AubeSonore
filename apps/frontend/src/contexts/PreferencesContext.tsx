import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { preferencesApi, type UserPreferences, type PreferredPlatform } from '../lib/api';
import { useAuth } from './AuthContext';

// ─────────────────────────────────────────────
// Single source of truth for user preferences.
// Previously usePreferences() was a hook instantiated in 2 places
// (AlbumArt + LikedTracksModal) which led to duplicated fetches and out-of-sync
// state when one side updated the preferred platform.
// ─────────────────────────────────────────────

interface PreferencesContextValue {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePlatform: (platform: PreferredPlatform) => Promise<boolean>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const prevAuthRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && wasAuthenticated !== true) {
      const loadPreferences = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const data = await preferencesApi.getPreferences();
          setPreferences(data);
        } catch {
          setPreferences(null);
        } finally {
          setIsLoading(false);
        }
      };
      void loadPreferences();
    } else if (!isAuthenticated && wasAuthenticated === true) {
      setPreferences(null);
      setError(null);
    }
  }, [isAuthenticated, authLoading]);

  const updatePlatform = useCallback(
    async (platform: PreferredPlatform): Promise<boolean> => {
      if (!isAuthenticated) return false;

      try {
        const result = await preferencesApi.updatePreferences(platform);
        setPreferences(result.preferences);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
        return false;
      }
    },
    [isAuthenticated]
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({ preferences, isLoading, error, updatePlatform }),
    [preferences, isLoading, error, updatePlatform]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return ctx;
}
