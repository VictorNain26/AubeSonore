import { useEffect, useRef, useCallback } from 'react';
import { useCastStore } from '../stores/castStore';
import { usePlayerStore } from '../stores/playerStore';
import { getSessionManager, loadMedia, isCastAvailable } from '../lib/cast';
import { STREAM_URL } from '../config/env';

/**
 * CastProvider - Manages Google Cast session lifecycle
 *
 * Best Practices 2025/2026:
 * - No context needed - all state is in Zustand store
 * - Proper cleanup of subscriptions
 * - Error boundary consideration
 * - Stable callback references
 */
export function CastProvider({ children }: { children: React.ReactNode }) {
  const mountedRef = useRef(true);
  const subscriptionsRef = useRef<Array<{ remove: () => void }>>([]);

  // Store actions - stable references
  const setCasting = useCastStore((s) => s.setCasting);
  const setConnecting = useCastStore((s) => s.setConnecting);
  const setError = useCastStore((s) => s.setError);
  const setChromecastAvailable = useCastStore((s) => s.setChromecastAvailable);

  /**
   * Load current track to Chromecast when session starts
   */
  const handleSessionStarted = useCallback(async () => {
    if (!mountedRef.current) return;

    setCasting(true, 'Chromecast', 'chromecast');

    // Load current song to cast device
    const song = usePlayerStore.getState().currentSong;
    if (!song) return;

    const success = await loadMedia(STREAM_URL, {
      title: song.title,
      artist: song.artist,
      artworkUrl: song.art,
    });

    if (!success && mountedRef.current) {
      console.warn('[CastProvider] Failed to load media to cast device');
    }
  }, [setCasting]);

  useEffect(() => {
    mountedRef.current = true;

    // Check if Cast is available
    if (!isCastAvailable()) {
      setChromecastAvailable(false);
      return;
    }

    setChromecastAvailable(true);

    const sessionManager = getSessionManager();
    if (!sessionManager) {
      setChromecastAvailable(false);
      return;
    }

    // Subscribe to session events
    subscriptionsRef.current = [
      sessionManager.onSessionStarting(() => {
        if (mountedRef.current) setConnecting(true);
      }),

      sessionManager.onSessionStarted(() => {
        handleSessionStarted();
      }),

      sessionManager.onSessionResumed(() => {
        // Session resumed after app was backgrounded
        handleSessionStarted();
      }),

      sessionManager.onSessionEnded(() => {
        if (mountedRef.current) {
          setCasting(false);
          setConnecting(false);
        }
      }),

      sessionManager.onSessionStartFailed((error) => {
        if (!mountedRef.current) return;
        setConnecting(false);
        setError(error?.message ?? 'Connexion échouée');
      }),
    ];

    // Cleanup subscriptions on unmount
    return () => {
      mountedRef.current = false;
      subscriptionsRef.current.forEach((sub) => sub.remove());
      subscriptionsRef.current = [];
    };
  }, [setCasting, setConnecting, setError, setChromecastAvailable, handleSessionStarted]);

  return <>{children}</>;
}
