import { createContext, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
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

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(STREAM_URL);
  const status = useAudioPlayerStatus(player);

  // Store selectors
  const currentSong = usePlayerStore((s) => s.currentSong);
  const volume = usePlayerStore((s) => s.volume);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setIsLoading = usePlayerStore((s) => s.setIsLoading);
  const setError = usePlayerStore((s) => s.setError);

  // Track if lock screen has been activated
  const lockScreenActiveRef = useRef(false);

  // ─────────────────────────────────────────────
  // 1. Configure Audio Mode
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
  // 2. Sync status with store
  // ─────────────────────────────────────────────
  useEffect(() => {
    setIsPlaying(status.playing);
    setIsLoading(status.isBuffering);
  }, [status.playing, status.isBuffering, setIsPlaying, setIsLoading]);

  // ─────────────────────────────────────────────
  // 3. Volume
  // ─────────────────────────────────────────────
  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

  // ─────────────────────────────────────────────
  // 4. Lock Screen - SINGLE SOURCE OF TRUTH
  //    Activate once on first play, then only update metadata
  // ─────────────────────────────────────────────
  useEffect(() => {
    // Only activate lock screen when playing starts
    if (!status.playing) return;

    const metadata = {
      title: currentSong?.title || 'Aube Sonore',
      artist: currentSong?.artist || 'Radio en direct',
      albumTitle: 'Aube Sonore',
      artworkUrl: currentSong?.art || DEFAULT_ARTWORK,
    };

    if (!lockScreenActiveRef.current) {
      // First time - activate lock screen
      player.setActiveForLockScreen(true, metadata, {
        showSeekBackward: false,
        showSeekForward: false,
      });
      lockScreenActiveRef.current = true;
    } else {
      // Already active - just update metadata
      player.updateLockScreenMetadata(metadata);
    }
  }, [player, status.playing, currentSong]);

  // ─────────────────────────────────────────────
  // 5. Cleanup on unmount
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
    // Stop playback - for webradio, play() will reconnect fresh to live stream
    player.pause();
    // Note: Don't use replace(null) as it crashes expo-audio
    // The next play() call will use replace(STREAM_URL) to reconnect
  }, [player]);

  const setVolume = useCallback(
    (value: number) => {
      player.volume = Math.max(0, Math.min(1, value));
    },
    [player]
  );

  // Memoize context value to prevent unnecessary re-renders of consumers
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
