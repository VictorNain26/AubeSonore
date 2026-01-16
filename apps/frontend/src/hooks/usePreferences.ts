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

export const PLATFORMS: { id: PreferredPlatform; name: string; icon: string; color: string }[] = [
  { id: 'spotify', name: 'Spotify', icon: '🟢', color: '#1DB954' },
  { id: 'appleMusic', name: 'Apple Music', icon: '🍎', color: '#FA243C' },
  { id: 'deezer', name: 'Deezer', icon: '🎵', color: '#FEAA2D' },
  { id: 'youtubeMusic', name: 'YouTube Music', icon: '🔴', color: '#FF0000' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#FF0000' },
  { id: 'tidal', name: 'Tidal', icon: '🌊', color: '#000000' },
  { id: 'amazonMusic', name: 'Amazon Music', icon: '📦', color: '#FF9900' },
  { id: 'soundcloud', name: 'SoundCloud', icon: '☁️', color: '#FF5500' },
];
