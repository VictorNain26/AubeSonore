import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { usePlayerStore } from '../../src/stores/playerStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useLikedTracksStore } from '../../src/stores/likedTracksStore';
import { useAudio } from '../../src/providers/AudioProvider';
import {
  AlbumArt,
  CastButton,
  PlayButton,
  ListenerCount,
} from '../../src/components';

// ─────────────────────────────────────────────
// Precise Timer Hook
// ─────────────────────────────────────────────

function usePreciseTimer(serverElapsed: number | undefined, duration: number, trackId: string | undefined) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (serverElapsed !== undefined) {
      baseElapsedRef.current = serverElapsed;
      startTimeRef.current = Date.now();
      setElapsed(serverElapsed);
    }
  }, [serverElapsed, trackId]);

  useEffect(() => {
    if (duration > 0) {
      startTimeRef.current = Date.now();

      if (animationRef.current) {
        clearInterval(animationRef.current);
      }

      animationRef.current = setInterval(() => {
        const deltaSeconds = (Date.now() - startTimeRef.current) / 1000;
        const newElapsed = Math.min(baseElapsedRef.current + deltaSeconds, duration);
        setElapsed(newElapsed);
      }, 16);

      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current);
        }
      };
    }
  }, [duration]);

  return elapsed;
}

// ─────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// Main Player Screen
// ─────────────────────────────────────────────

export default function PlayerScreen() {
  const router = useRouter();

  // Audio controls
  const { play, stop } = useAudio();

  // Player state
  const { isPlaying, isLoading, currentSong, nowPlaying } = usePlayerStore();

  // Auth state
  const { isAuthenticated } = useAuthStore();

  // Liked tracks state
  const { isTrackLiked, likeTrack, unlikeTrack, tracks } = useLikedTracksStore();

  // Duration and elapsed
  const duration = nowPlaying?.now_playing?.duration || 0;
  const serverElapsed = nowPlaying?.now_playing?.elapsed;
  const trackId = nowPlaying?.now_playing?.sh_id?.toString();

  const elapsed = usePreciseTimer(serverElapsed, duration, trackId);
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  // Check if current track is liked
  const isCurrentTrackLiked = currentSong
    ? isTrackLiked(currentSong.title, currentSong.artist)
    : false;

  // Handle play/stop with haptic feedback
  const handleTogglePlay = useCallback(() => {
    if (isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    isPlaying ? stop() : play();
  }, [isPlaying, play, stop, isLoading]);

  // Handle like/unlike with haptic feedback
  const handleToggleLike = useCallback(async () => {
    if (!currentSong) return;

    if (!isAuthenticated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/auth');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { title, artist, art } = currentSong;
    const existingTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === title.toLowerCase() &&
        t.artist.toLowerCase() === artist.toLowerCase()
    );

    if (existingTrack) {
      await unlikeTrack(existingTrack.id);
    } else {
      await likeTrack({
        title,
        artist,
        artworkUrl: art,
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`)}`,
      });
    }
  }, [currentSong, isAuthenticated, tracks, likeTrack, unlikeTrack, router]);

  const listeners = nowPlaying?.listeners?.current;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header with swipe hint */}
      <View style={styles.header}>
        <Pressable style={styles.swipeHintTop}>
          <View style={styles.navLine} />
          <View style={styles.swipeHintRow}>
            <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.swipeHintText}>Profil</Text>
            <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.3)" />
          </View>
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Listener count - top aligned */}
        {listeners !== undefined && listeners > 0 && (
          <View style={styles.listenerSection}>
            <ListenerCount count={listeners} />
          </View>
        )}

        {/* Album Art */}
        <View style={styles.artSection}>
          <AlbumArt
            artUrl={currentSong?.art}
            title={currentSong?.title}
            isPlaying={isPlaying}
            isLiked={isCurrentTrackLiked}
            isLive={nowPlaying?.live?.is_live}
            onToggleLike={handleToggleLike}
          />
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={2}>
            {currentSong?.title || 'En attente...'}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentSong?.artist || '-'}
          </Text>
        </View>

        {/* Waveform Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.timeText}>{formatTime(elapsed)}</Text>
            <View style={styles.waveformContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
            <Text style={[styles.timeText, styles.timeTextRight]}>
              {formatTime(duration)}
            </Text>
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsSection}>
          <CastButton size="medium" />
          <PlayButton
            isPlaying={isPlaying}
            isLoading={isLoading}
            onPress={handleTogglePlay}
            size="large"
          />
        </View>
      </View>

      {/* Navigation hint - bottom */}
      <Pressable style={styles.swipeHintBottom}>
        <View style={styles.swipeHintRow}>
          <Ionicons name="chevron-up" size={12} color="rgba(255,255,255,0.3)" />
          <Text style={styles.swipeHintText}>Musique</Text>
          <Ionicons name="musical-notes-outline" size={14} color="rgba(255,255,255,0.4)" />
        </View>
        <View style={styles.navLine} />
      </Pressable>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1118',
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
  },
  swipeHintTop: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  swipeHintBottom: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  navLine: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  listenerSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  artSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  trackInfo: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
  },
  trackArtist: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textAlign: 'center',
  },
  progressSection: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontVariant: ['tabular-nums'],
    width: 38,
  },
  timeTextRight: {
    textAlign: 'right',
  },
  waveformContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9370DB',
    borderRadius: 2,
  },
  controlsSection: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
});
