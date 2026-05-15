import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isDefaultArtwork } from '@aubesonore/core/azuracast';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  FadeInDown,
} from 'react-native-reanimated';

import { usePlayerStore } from '../src/stores/playerStore';
import { useSleepTimer } from '../src/stores/sleepTimerStore';
import { useStatsStore } from '../src/stores/statsStore';
import { useAudio } from '../src/providers/AudioProvider';
import { useLikeToggle } from '../src/hooks/useLikeToggle';
import {
  CastButton,
  AnimatedProgressBar,
  SleepTimer,
  LyricsPanel,
  ArtistContext,
  ShareButton,
} from '../src/components';
import {
  DragHandle,
  LiveIndicator,
  ListenerCount,
  LikeButton,
  PlayerPlayButton,
} from '../src/components/player';
import { DEFAULT_ARTWORK } from '../src/config/env';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;
const ARTWORK_SIZE = SCREEN_WIDTH * 0.65;

// ─────────────────────────────────────────────
// Full Player Modal
// ─────────────────────────────────────────────

export default function PlayerModal() {
  const router = useRouter();
  const translateY = useSharedValue(0);
  const { play, stop } = useAudio();

  const [showLyrics, setShowLyrics] = useState(false);

  const { isPlaying, isLoading, currentSong, nowPlaying } = usePlayerStore(
    useShallow((s) => ({
      isPlaying: s.isPlaying,
      isLoading: s.isLoading,
      currentSong: s.currentSong,
      nowPlaying: s.nowPlaying,
    }))
  );

  const { isLiked: isCurrentTrackLiked, toggleLike: handleToggleLike } = useLikeToggle(currentSong);

  // Sleep timer — watch for end-of-track mode
  const sleepTimerMode = useSleepTimer((s) => s.mode);
  const triggerEndOfTrack = useSleepTimer((s) => s.triggerEndOfTrack);
  const sleepTimerActive = useSleepTimer((s) => s.isActive);
  const prevShIdRef = useRef<string | undefined>(undefined);

  // Stats — tick every 10s while playing, record track changes
  const tickListeningTime = useStatsStore((s) => s.tickListeningTime);
  const recordTrackChange = useStatsStore((s) => s.recordTrackChange);

  const duration = nowPlaying?.now_playing?.duration || 0;
  const elapsed = nowPlaying?.now_playing?.elapsed || 0;
  const trackId = nowPlaying?.now_playing?.sh_id?.toString();
  const listeners = nowPlaying?.listeners?.current;
  const isLive = nowPlaying?.live?.is_live;

  // Determine artwork URL
  const artUrl = currentSong?.art;
  const isDefaultCover = isDefaultArtwork(artUrl);
  const displayArtUrl = isDefaultCover ? DEFAULT_ARTWORK : artUrl;

  // ─────────────────────────────────────────────
  // Stats: tick every 10s while playing
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => tickListeningTime(), 10_000);
    return () => clearInterval(id);
  }, [isPlaying, tickListeningTime]);

  // ─────────────────────────────────────────────
  // Stats + Sleep Timer: watch sh_id changes
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!trackId) return;
    if (prevShIdRef.current && prevShIdRef.current !== trackId) {
      // Track changed
      if (currentSong?.artist && currentSong?.title) {
        recordTrackChange(currentSong.artist, currentSong.title);
      }
      // End-of-track sleep timer
      if (sleepTimerActive && sleepTimerMode === 'end-of-track') {
        triggerEndOfTrack();
        stop();
      }
    }
    prevShIdRef.current = trackId;
  }, [
    trackId,
    currentSong,
    recordTrackChange,
    sleepTimerActive,
    sleepTimerMode,
    triggerEndOfTrack,
    stop,
  ]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleTogglePlay = useCallback(() => {
    if (isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  }, [isPlaying, isLoading, play, stop]);

  const handleToggleLyrics = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLyrics((prev) => !prev);
  }, []);

  // Swipe down gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <View className="flex-1 bg-surface-base">
          {/* Background with blurred artwork */}
          <ImageBackground
            source={{ uri: displayArtUrl }}
            className="absolute inset-0"
            resizeMode="cover"
            blurRadius={100}
          >
            <View className="absolute inset-0 bg-surface-base/80" />
          </ImageBackground>

          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View className="px-5">
                <DragHandle />
                <View className="flex-row justify-between items-center">
                  <Pressable
                    onPress={handleClose}
                    className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
                  >
                    <Ionicons name="chevron-down" size={24} color="white" />
                  </Pressable>

                  <View className="flex-row items-center gap-2">
                    {isLive && <LiveIndicator />}
                    {listeners !== undefined && listeners > 0 && (
                      <ListenerCount count={listeners} />
                    )}
                  </View>

                  <View className="flex-row items-center gap-2">
                    <SleepTimer />
                    <CastButton size="medium" />
                  </View>
                </View>
              </View>

              {/* Content */}
              <View className="flex-1 justify-center items-center px-6">
                {/* Album Artwork */}
                <Animated.View
                  entering={FadeInDown.duration(400).springify()}
                  className="mb-8 rounded-3xl overflow-hidden"
                  style={{
                    width: ARTWORK_SIZE,
                    height: ARTWORK_SIZE,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 20 },
                    shadowOpacity: 0.6,
                    shadowRadius: 30,
                    elevation: 20,
                  }}
                >
                  <Image
                    source={{ uri: displayArtUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </Animated.View>

                {/* Track Info */}
                <Animated.View
                  entering={FadeInDown.duration(400).delay(50).springify()}
                  className="items-center mb-4 w-full px-4"
                >
                  <Text
                    className="text-2xl font-bold text-white text-center mb-1"
                    numberOfLines={2}
                  >
                    {currentSong?.title || 'En attente...'}
                  </Text>
                  <Text className="text-lg text-white/60 text-center" numberOfLines={1}>
                    {currentSong?.artist || '-'}
                  </Text>
                </Animated.View>

                {/* Lyrics Panel */}
                <LyricsPanel
                  artist={currentSong?.artist}
                  title={currentSong?.title}
                  elapsed={elapsed}
                  isVisible={showLyrics}
                />

                {/* Progress Bar */}
                <Animated.View
                  entering={FadeInDown.duration(400).delay(100).springify()}
                  className="w-full mb-6 mt-4"
                >
                  <AnimatedProgressBar elapsed={elapsed} duration={duration} trackId={trackId} />
                </Animated.View>

                {/* Controls */}
                <Animated.View
                  entering={FadeInDown.duration(400).delay(150).springify()}
                  className="flex-row items-center justify-center gap-8"
                >
                  {/* Lyrics Toggle */}
                  <Pressable
                    onPress={handleToggleLyrics}
                    className="w-12 h-12 items-center justify-center"
                  >
                    <Ionicons
                      name="text-outline"
                      size={22}
                      color={showLyrics ? '#9370DB' : 'rgba(255,255,255,0.4)'}
                    />
                  </Pressable>

                  <LikeButton
                    isLiked={isCurrentTrackLiked}
                    isLoading={false}
                    onPress={handleToggleLike}
                  />
                  <PlayerPlayButton
                    isPlaying={isPlaying}
                    isLoading={isLoading}
                    onPress={handleTogglePlay}
                  />

                  {/* Share */}
                  <View className="w-12 h-12 items-center justify-center">
                    <ShareButton
                      title={currentSong?.title || ''}
                      artist={currentSong?.artist || ''}
                      artworkUrl={currentSong?.art}
                    />
                  </View>
                </Animated.View>

                {/* Artist Context */}
                <ArtistContext artistName={currentSong?.artist} />
              </View>
            </ScrollView>

            {/* Footer */}
            <View className="items-center pb-4">
              <Text className="text-xs text-white/30">Glisser vers le bas pour fermer</Text>
            </View>
          </SafeAreaView>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
