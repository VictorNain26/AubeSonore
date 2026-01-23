import { useCallback } from 'react';
import { View, Text, Pressable, Dimensions, Image, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  FadeInDown,
} from 'react-native-reanimated';

import { usePlayerStore } from '../src/stores/playerStore';
import { useAudio } from '../src/providers/AudioProvider';
import { useLikeToggle } from '../src/hooks/useLikeToggle';
import { CastButton, AnimatedProgressBar } from '../src/components';
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
const ARTWORK_SIZE = SCREEN_WIDTH * 0.75;

// ─────────────────────────────────────────────
// Full Player Modal
// ─────────────────────────────────────────────

export default function PlayerModal() {
  const router = useRouter();
  const translateY = useSharedValue(0);
  const { play, stop } = useAudio();

  const { isPlaying, isLoading, currentSong, nowPlaying } = usePlayerStore(
    useShallow((s) => ({
      isPlaying: s.isPlaying,
      isLoading: s.isLoading,
      currentSong: s.currentSong,
      nowPlaying: s.nowPlaying,
    }))
  );

  const { isLiked: isCurrentTrackLiked, toggleLike: handleToggleLike } = useLikeToggle(currentSong);

  const duration = nowPlaying?.now_playing?.duration || 0;
  const elapsed = nowPlaying?.now_playing?.elapsed || 0;
  const trackId = nowPlaying?.now_playing?.sh_id?.toString();
  const listeners = nowPlaying?.listeners?.current;
  const isLive = nowPlaying?.live?.is_live;

  // Determine artwork URL
  const artUrl = currentSong?.art;
  const isDefaultCover =
    !artUrl ||
    artUrl.includes('generic') ||
    artUrl.includes('default') ||
    artUrl.includes('placeholder');
  const displayArtUrl = isDefaultCover ? DEFAULT_ARTWORK : artUrl;

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
                  {listeners !== undefined && listeners > 0 && <ListenerCount count={listeners} />}
                </View>

                <CastButton size="medium" />
              </View>
            </View>

            {/* Content */}
            <View className="flex-1 justify-center items-center px-6">
              {/* Album Artwork */}
              <Animated.View
                entering={FadeInDown.duration(400).springify()}
                className="mb-10 rounded-3xl overflow-hidden"
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
                className="items-center mb-6 w-full px-4"
              >
                <Text className="text-2xl font-bold text-white text-center mb-1" numberOfLines={2}>
                  {currentSong?.title || 'En attente...'}
                </Text>
                <Text className="text-lg text-white/60 text-center" numberOfLines={1}>
                  {currentSong?.artist || '-'}
                </Text>
              </Animated.View>

              {/* Progress Bar */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(100).springify()}
                className="w-full mb-8"
              >
                <AnimatedProgressBar elapsed={elapsed} duration={duration} trackId={trackId} />
              </Animated.View>

              {/* Controls */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(150).springify()}
                className="flex-row items-center justify-center gap-10"
              >
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
                <View className="w-12 h-12" />
              </Animated.View>
            </View>

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
