import { memo, useCallback } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';

import { usePlayerStore } from '../stores/playerStore';
import { useAudio } from '../providers/AudioProvider';
import { useLikeToggle } from '../hooks/useLikeToggle';
import { CastButton } from './CastButton';
import { DEFAULT_ARTWORK } from '../config/env';

export const MiniPlayer = memo(function MiniPlayer() {
  const router = useRouter();
  const { play, stop } = useAudio();

  const { isPlaying, isLoading, currentSong, isLive } = usePlayerStore(
    useShallow((s) => ({
      isPlaying: s.isPlaying,
      isLoading: s.isLoading,
      currentSong: s.currentSong,
      isLive: s.nowPlaying?.live?.is_live,
    }))
  );

  const { isLiked: isCurrentTrackLiked, toggleLike } = useLikeToggle(currentSong);

  const handleTogglePlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  }, [isPlaying, play, stop]);

  const handleExpand = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/player');
  }, [router]);

  // Always show - with fallback values
  const title = currentSong?.title || 'Aubesonore';
  const artist = currentSong?.artist || 'Webradio';
  const artUrl = currentSong?.art || DEFAULT_ARTWORK;

  const isDefaultArt =
    !currentSong?.art || currentSong.art.includes('generic') || currentSong.art.includes('default');

  return (
    <Pressable onPress={handleExpand} style={styles.container}>
      {/* Artwork */}
      <View style={styles.artworkContainer}>
        {isDefaultArt ? (
          <View style={styles.defaultArtwork}>
            <Ionicons name="radio" size={22} color="rgba(147,112,219,0.8)" />
          </View>
        ) : (
          <Image source={{ uri: artUrl }} style={styles.artwork} />
        )}
        {/* Live indicator */}
        {isLive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {artist}
        </Text>
      </View>

      {/* Like Button */}
      {currentSong && (
        <Pressable
          onPress={() => {
            void toggleLike();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.likeButton}
        >
          <Ionicons
            name={isCurrentTrackLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={isCurrentTrackLiked ? '#ef4444' : 'rgba(255,255,255,0.5)'}
          />
        </Pressable>
      )}

      {/* Cast Button */}
      <CastButton size="small" />

      {/* Play/Pause Button */}
      <Pressable
        onPress={handleTogglePlay}
        disabled={isLoading}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.playButton}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : isPlaying ? (
          <Ionicons name="pause" size={26} color="white" />
        ) : (
          <Ionicons name="play" size={26} color="white" />
        )}
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1d24',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  artworkContainer: {
    position: 'relative',
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2a2d34',
  },
  defaultArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(147,112,219,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(147,112,219,0.2)',
  },
  liveIndicator: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1d24',
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  artist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  likeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(147,112,219,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
