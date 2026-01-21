import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import type { AudioPlayer } from 'expo-audio';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { usePlayerStore } from '../stores/playerStore';
import { STREAM_URL, DEFAULT_ARTWORK } from '../config/env';

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

interface AudioContextValue {
  player: AudioPlayer;
  play: () => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(STREAM_URL);
  const isAudioModeConfigured = useRef(false);

  // Store actions
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setIsLoading = usePlayerStore((s) => s.setIsLoading);
  const setError = usePlayerStore((s) => s.setError);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const volume = usePlayerStore((s) => s.volume);

  // Configure audio mode on mount
  useEffect(() => {
    async function configure() {
      if (isAudioModeConfigured.current) return;

      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
          interruptionModeAndroid: 'doNotMix',
        });
        isAudioModeConfigured.current = true;
      } catch (error) {
        console.error('Failed to configure audio mode:', error);
      }
    }

    configure();
  }, []);

  // Sync player state with store
  useEffect(() => {
    setIsPlaying(player.playing);
  }, [player.playing, setIsPlaying]);

  // Apply stored volume to player
  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

  // Update lock screen when song changes and playing
  useEffect(() => {
    async function updateLockScreen() {
      if (!player.playing || !currentSong) return;

      try {
        await player.updateLockScreenMetadata({
          title: currentSong.title,
          artist: currentSong.artist,
          albumTitle: 'Aube Sonore',
          artworkUrl: currentSong.art || DEFAULT_ARTWORK,
        });
      } catch (error) {
        console.error('Failed to update lock screen:', error);
      }
    }

    updateLockScreen();
  }, [player, player.playing, currentSong]);

  // Play function with lock screen activation
  const play = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      player.play();

      // Activate lock screen after a short delay
      setTimeout(async () => {
        try {
          await player.setActiveForLockScreen(true, {
            title: currentSong?.title || 'Aube Sonore',
            artist: currentSong?.artist || 'Radio en direct',
            albumTitle: 'Aube Sonore',
            artworkUrl: currentSong?.art || DEFAULT_ARTWORK,
          });
        } catch (error) {
          console.error('Failed to activate lock screen:', error);
        }
      }, 500);

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setError(error instanceof Error ? error.message : 'Erreur de lecture');
    }
  }, [player, currentSong, setIsLoading, setError]);

  // Stop function with lock screen deactivation
  const stop = useCallback(() => {
    player.pause();
    player.clearLockScreenControls?.();
  }, [player]);

  // Volume function
  const setVolume = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(1, value));
      player.volume = clamped;
    },
    [player]
  );

  const value: AudioContextValue = {
    player,
    play,
    stop,
    setVolume,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
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
