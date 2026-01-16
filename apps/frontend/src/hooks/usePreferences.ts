import { useState, useEffect, useCallback } from 'react';
import { preferencesApi, type UserPreferences, type PreferredPlatform } from '../lib/api';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les préférences au montage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await preferencesApi.getPreferences();
        setPreferences(data);
      } catch (err) {
        // Pas authentifié = pas de préférences (ce n'est pas une erreur critique)
        setPreferences(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Mettre à jour la plateforme préférée
  const updatePlatform = useCallback(async (platform: PreferredPlatform): Promise<boolean> => {
    try {
      const result = await preferencesApi.updatePreferences(platform);
      setPreferences(result.preferences);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return false;
    }
  }, []);

  return {
    preferences,
    isLoading,
    error,
    updatePlatform,
  };
}

// ─────────────────────────────────────────────
// Constantes pour les plateformes
// ─────────────────────────────────────────────

export const PLATFORMS: { id: PreferredPlatform; name: string }[] = [
  { id: 'spotify', name: 'Spotify' },
  { id: 'appleMusic', name: 'Apple Music' },
  { id: 'deezer', name: 'Deezer' },
  { id: 'youtubeMusic', name: 'YouTube Music' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'tidal', name: 'Tidal' },
  { id: 'amazonMusic', name: 'Amazon Music' },
  { id: 'soundcloud', name: 'SoundCloud' },
];
