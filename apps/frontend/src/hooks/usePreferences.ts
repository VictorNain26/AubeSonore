import { useState, useEffect, useCallback, useRef } from 'react';
import { preferencesApi, type UserPreferences, type PreferredPlatform } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────
// Hook pour gérer les préférences utilisateur
// ─────────────────────────────────────────────

interface UsePreferencesReturn {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePlatform: (platform: PreferredPlatform) => Promise<boolean>;
}

export function usePreferences(): UsePreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const prevAuthRef = useRef<boolean | null>(null);

  // Charger les préférences (seulement si authentifié)
  useEffect(() => {
    if (authLoading) return;

    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && wasAuthenticated !== true) {
      // Vient de se connecter -> charger les préférences
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
      // Vient de se déconnecter -> vider les préférences
      setPreferences(null);
      setError(null);
    }
  }, [isAuthenticated, authLoading]);

  // Mettre à jour la plateforme préférée
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

  return {
    preferences,
    isLoading,
    error,
    updatePlatform,
  };
}

// PLATFORMS list now lives in @aubesonore/shared-types/client (single source
// of truth shared with backend validator + mobile).
