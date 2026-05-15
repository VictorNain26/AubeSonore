import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useLayoutEffect,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

import { usePlayerStore } from '../stores/playerStore';
import { useCastStore } from '../stores/castStore';
import { STREAM_URL, DEFAULT_ARTWORK } from '../config/env';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Parse song metadata from AzuraCast
 *
 * AzuraCast sometimes returns `title` as "Song Title - Artist Name"
 * This causes duplication on lock screen when displayed with separate artist field.
 * We need to extract clean title and artist.
 */
function parseSongMetadata(
  title: string | undefined,
  artist: string | undefined
): { title: string; artist: string } {
  const defaultTitle = 'AubeSonore';
  const defaultArtist = 'Radio en direct';

  if (!title && !artist) {
    return { title: defaultTitle, artist: defaultArtist };
  }

  // If title contains " - " it might be "Title - Artist" format
  if (title && title.includes(' - ')) {
    const parts = title.split(' - ');

    // Case: "Title - Artist" where Artist matches the artist field
    if (parts.length === 2) {
      const [titlePart, artistPart] = parts;

      // If artist field matches the second part, use only the title part
      if (artist && artistPart.toLowerCase().trim() === artist.toLowerCase().trim()) {
        return {
          title: titlePart.trim() || defaultTitle,
          artist: artist || defaultArtist,
        };
      }

      // If no separate artist field, use parsed parts
      if (!artist || artist === artistPart.trim()) {
        return {
          title: titlePart.trim() || defaultTitle,
          artist: artistPart.trim() || defaultArtist,
        };
      }
    }
  }

  // Default: use fields as-is
  return {
    title: title || defaultTitle,
    artist: artist || defaultArtist,
  };
}

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

  // Cast state
  const isCasting = useCastStore((s) => s.isCasting);

  // Lock screen state tracking
  const lockScreenActiveRef = useRef(false);
  const playerRef = useRef(player);

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

  // Sync player ref
  useLayoutEffect(() => {
    playerRef.current = player;
  }, [player]);

  // ─────────────────────────────────────────────
  // 3. Volume sync
  // ─────────────────────────────────────────────
  useEffect(() => {
    playerRef.current.volume = volume;
  }, [volume]);

  // ─────────────────────────────────────────────
  // 4. Lock Screen Management
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (status.playing) {
      const { title, artist } = parseSongMetadata(currentSong?.title, currentSong?.artist);

      const metadata = {
        title,
        artist,
        artworkUrl: currentSong?.art || DEFAULT_ARTWORK,
      };

      if (!lockScreenActiveRef.current) {
        player.setActiveForLockScreen(true, metadata, {
          showSeekBackward: false,
          showSeekForward: false,
        });
        lockScreenActiveRef.current = true;
      } else {
        player.updateLockScreenMetadata(metadata);
      }
    } else if (lockScreenActiveRef.current) {
      player.clearLockScreenControls();
      lockScreenActiveRef.current = false;
    }
  }, [player, status.playing, currentSong]);

  // ─────────────────────────────────────────────
  // 5. App State Listener - Cleanup on app close
  // ─────────────────────────────────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
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
  // 7. Cast awareness — pause local when casting starts
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isCasting && status.playing) {
      useCastStore.getState().setWasPlayingBeforeCast(true);
      player.pause();
    }
  }, [isCasting, status.playing, player]);

  // ─────────────────────────────────────────────
  // 8. Resume local playback when cast disconnects
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isCasting && useCastStore.getState().wasPlayingBeforeCast) {
      useCastStore.getState().setWasPlayingBeforeCast(false);
      player.replace(STREAM_URL);
      player.play();
    }
  }, [isCasting, player]);

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────

  const play = useCallback(() => {
    // Don't start local audio while casting
    if (useCastStore.getState().isCasting) return;

    setError(null);
    player.replace(STREAM_URL);
    player.play();
  }, [player, setError]);

  const stop = useCallback(() => {
    // If casting, clear the resume flag so we don't auto-resume on disconnect
    if (useCastStore.getState().isCasting) {
      useCastStore.getState().setWasPlayingBeforeCast(false);
    }
    player.pause();
  }, [player]);

  const setVolume = useCallback((value: number) => {
    playerRef.current.volume = Math.max(0, Math.min(1, value));
  }, []);

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
