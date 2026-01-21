import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import GoogleCast, {
  CastState,
  useCastState,
  useRemoteMediaClient,
} from 'react-native-google-cast';
import { useAirplayConnectivity } from 'react-airplay';
import { useCastStore } from '../stores/castStore';
import { usePlayerStore } from '../stores/playerStore';
import { loadMedia as loadCastMedia, getConnectedDeviceName } from '../services/cast';
import type { CastMediaMetadata } from '../types/cast';

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

interface CastContextValue {
  // Cast controls
  startCasting: (metadata?: CastMediaMetadata) => Promise<void>;
  stopCasting: () => Promise<void>;
  updateNowPlaying: (metadata: CastMediaMetadata) => Promise<void>;
}

const CastContext = createContext<CastContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function CastProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useRef(false);
  const currentSongRef = useRef<ReturnType<typeof usePlayerStore.getState>['currentSong']>(null);

  // Cast store actions
  const { setCasting, setConnecting, setError, setChromecastAvailable } = useCastStore();

  // Player store for now playing info
  const currentSong = usePlayerStore((s) => s.currentSong);

  // Keep ref updated for use in callbacks
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  // Google Cast hooks
  const castState = useCastState();
  const client = useRemoteMediaClient();

  // AirPlay hooks (iOS only)
  // Note: useAirplayConnectivity returns boolean directly
  const airplayConnected = useAirplayConnectivity();
  const isAirplayConnected = Platform.OS === 'ios' ? airplayConnected : false;

  // Initialize on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    let sessionManager: ReturnType<typeof GoogleCast.getSessionManager>;

    try {
      sessionManager = GoogleCast.getSessionManager();
    } catch (error) {
      console.error('[CastProvider] Failed to get session manager:', error);
      return;
    }

    const onSessionStarting = sessionManager.onSessionStarting(() => {
      console.log('[CastProvider] Session starting...');
      setConnecting(true);
    });

    const onSessionStarted = sessionManager.onSessionStarted(async () => {
      console.log('[CastProvider] Session started');
      const deviceName = await getConnectedDeviceName();
      setCasting(true, deviceName ?? 'Chromecast', 'chromecast');
      setConnecting(false);

      // Auto-load media if currently playing (use ref to avoid stale closure)
      const song = currentSongRef.current;
      if (song) {
        loadCastMedia({
          title: song.title,
          artist: song.artist,
          artworkUrl: song.art,
        }).catch((err) => {
          console.error('[CastProvider] Failed to load media:', err);
        });
      }
    });

    const onSessionEnding = sessionManager.onSessionEnding(() => {
      console.log('[CastProvider] Session ending...');
    });

    const onSessionEnded = sessionManager.onSessionEnded((_, error) => {
      console.log('[CastProvider] Session ended', error ? `with error: ${error}` : '');
      setCasting(false);
      if (error) {
        setError(`Cast session ended: ${error}`);
      }
    });

    const onSessionStartFailed = sessionManager.onSessionStartFailed((_, error) => {
      console.error('[CastProvider] Session start failed:', error);
      setConnecting(false);
      setError(`Failed to connect: ${error}`);
    });

    // Cleanup listeners on unmount
    return () => {
      onSessionStarting.remove();
      onSessionStarted.remove();
      onSessionEnding.remove();
      onSessionEnded.remove();
      onSessionStartFailed.remove();
    };
  }, [setCasting, setConnecting, setError]);

  // Update Chromecast availability based on cast state
  useEffect(() => {
    const isAvailable = castState !== CastState.NO_DEVICES_AVAILABLE;
    setChromecastAvailable(isAvailable);
  }, [castState, setChromecastAvailable]);

  // Handle AirPlay connection state (iOS only)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    if (isAirplayConnected) {
      setCasting(true, 'AirPlay', 'airplay');
    } else {
      // Only reset if currently casting via AirPlay
      const currentCastType = useCastStore.getState().castType;
      if (currentCastType === 'airplay') {
        setCasting(false);
      }
    }
  }, [isAirplayConnected, setCasting]);

  // Update now playing on cast device when track changes
  useEffect(() => {
    const { isCasting, castType } = useCastStore.getState();

    if (isCasting && castType === 'chromecast' && client && currentSong) {
      // Update metadata on the cast device
      loadCastMedia({
        title: currentSong.title,
        artist: currentSong.artist,
        artworkUrl: currentSong.art,
      }).catch((err) => {
        console.error('[CastProvider] Failed to update now playing:', err);
      });
    }
  }, [currentSong, client]);

  // Start casting
  const startCasting = useCallback(async () => {
    try {
      setConnecting(true);
      await GoogleCast.showCastDialog();
      // The actual casting will be handled by session events
    } catch (error) {
      console.error('[CastProvider] Failed to start casting:', error);
      setConnecting(false);
      setError(error instanceof Error ? error.message : 'Failed to start casting');
    }
  }, [setConnecting, setError]);

  // Stop casting
  const stopCasting = useCallback(async () => {
    try {
      await GoogleCast.getSessionManager().endCurrentSession(true);
      setCasting(false);
    } catch (error) {
      console.error('[CastProvider] Failed to stop casting:', error);
    }
  }, [setCasting]);

  // Update now playing metadata
  const updateNowPlaying = useCallback(async (metadata: CastMediaMetadata) => {
    const { isCasting, castType } = useCastStore.getState();

    if (!isCasting || castType !== 'chromecast') return;

    try {
      await loadCastMedia(metadata);
    } catch (error) {
      console.error('[CastProvider] Failed to update now playing:', error);
    }
  }, []);

  const value: CastContextValue = {
    startCasting,
    stopCasting,
    updateNowPlaying,
  };

  return <CastContext.Provider value={value}>{children}</CastContext.Provider>;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useCast() {
  const context = useContext(CastContext);
  if (!context) {
    throw new Error('useCast must be used within a CastProvider');
  }
  return context;
}
