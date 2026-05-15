import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLikedTracksStore } from '../stores/likedTracksStore';
import { usePreferencesStore } from '../stores/preferencesStore';

// Invisible auth → stores sync. Watches the React-Context-owned auth
// state and dispatches refresh()/clear() on the auth-agnostic Zustand
// stores. Mounted once at the app root; renders nothing.

export function AuthDataSync(): null {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const refreshLiked = useLikedTracksStore((s) => s.refresh);
  const clearLiked = useLikedTracksStore((s) => s.clear);
  const refreshPrefs = usePreferencesStore((s) => s.refresh);
  const clearPrefs = usePreferencesStore((s) => s.clear);
  const prevAuthRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && wasAuthenticated !== true) {
      void refreshLiked();
      void refreshPrefs();
    } else if (!isAuthenticated && wasAuthenticated === true) {
      clearLiked();
      clearPrefs();
    }
  }, [isAuthenticated, authLoading, refreshLiked, clearLiked, refreshPrefs, clearPrefs]);

  return null;
}
