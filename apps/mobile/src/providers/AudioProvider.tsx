import { createContext, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

import { usePlayerStore } from '../stores/playerStore';
import { STREAM_URL, DEFAULT_ARTWORK } from '../config/env';

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

interface AudioContextValue {
  play: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

/**
 * AudioProvider - Manages audio playback and lock screen controls
 *
 * Best Practices 2025/2026:
 * - Single source of truth for lock screen state
 * - Proper cleanup on stop and app close
 * - No albumTitle to avoid duplicate artist display
 * - AppState listener for app lifecycle
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(STREAM_URL);
  const status = useAudioPlayerStatus(player);

  // Store selectors - individual for stability
  const currentSong = usePlayerStore((s) => s.currentSong);
  const volume = usePlayerStore((s) => s.volume);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setIsLoading = usePlayerStore((s) => s.setIsLoading);
  const setError = usePlayerStore((s) => s.setError);

  // Lock screen state tracking
  const lockScreenActiveRef = useRef(false);

  // ─────────────────────────────────────────────
  // 1. Configure Audio Mode (once)
  // ─────────────────────────────────────────────
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      interruptionModeAndroid: 'doNotMix',
    }).catch(console.error);
  }, []);

  // ─────────────────────────────────────────────
  // 2. Sync player status with store
  // ─────────────────────────────────────────────
  useEffect(() => {
    setIsPlaying(status.playing);
    setIsLoading(status.isBuffering);
  }, [status.playing, status.isBuffering, setIsPlaying, setIsLoading]);

  // ─────────────────────────────────────────────
  // 3. Volume sync
  // ─────────────────────────────────────────────
  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

  // ─────────────────────────────────────────────
  // 4. Lock Screen Management
  //    - Activate when playing starts
  //    - Update metadata when song changes
  //    - Clear when stopped
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (status.playing) {
      // Build metadata - NO albumTitle to avoid duplication
      const metadata = {
        title: currentSong?.title || 'Aube Sonore',
        artist: currentSong?.artist || 'Radio en direct',
        artworkUrl: currentSong?.art || DEFAULT_ARTWORK,
      };

      if (!lockScreenActiveRef.current) {
        // First activation
        player.setActiveForLockScreen(true, metadata, {
          showSeekBackward: false,
          showSeekForward: false,
        });
        lockScreenActiveRef.current = true;
      } else {
        // Just update metadata
        player.updateLockScreenMetadata(metadata);
      }
    } else if (lockScreenActiveRef.current) {
      // Stopped playing - clear lock screen
      player.clearLockScreenControls();
      lockScreenActiveRef.current = false;
    }
  }, [player, status.playing, currentSong]);

  // ─────────────────────────────────────────────
  // 5. App State Listener - Cleanup on app close
  // ─────────────────────────────────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      // When app is terminated or goes inactive while not playing
      if (nextState === 'inactive' && !status.playing && lockScreenActiveRef.current) {
        player.clearLockScreenControls();
        lockScreenActiveRef.current = false;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [player, status.playing]);

  // ─────────────────────────────────────────────
  // 6. Cleanup on unmount
  // ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      player.pause();
      if (lockScreenActiveRef.current) {
        player.clearLockScreenControls();
        lockScreenActiveRef.current = false;
      }
    };
  }, [player]);

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────

  const play = useCallback(() => {
    setError(null);
    // Reconnect fresh to live stream (webradio behavior)
    player.replace(STREAM_URL);
    player.play();
  }, [player, setError]);

  const stop = useCallback(() => {
    player.pause();
    // Lock screen will be cleared by the effect watching status.playing
  }, [player]);

  const setVolume = useCallback(
    (value: number) => {
      player.volume = Math.max(0, Math.min(1, value));
    },
    [player]
  );

  // Memoize context value
  const contextValue = useMemo(() => ({ play, stop, setVolume }), [play, stop, setVolume]);

  return <AudioContext.Provider value={contextValue}>{children}</AudioContext.Provider>;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
