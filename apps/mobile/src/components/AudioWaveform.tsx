import { memo, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import type { AudioPlayer } from 'expo-audio';
import { useAudioSampleListener, requestRecordingPermissionsAsync } from 'expo-audio';

interface AudioWaveformProps {
  player: AudioPlayer;
  isPlaying: boolean;
  barCount?: number;
  color?: string;
}

const DEFAULT_BAR_COUNT = 32;
const MIN_HEIGHT = 2;
const MAX_HEIGHT = 40;

/**
 * Audio waveform visualization using expo-audio's useAudioSampleListener
 * Requires RECORD_AUDIO permission on Android
 */
export const AudioWaveform = memo(function AudioWaveform({
  player,
  isPlaying,
  barCount = DEFAULT_BAR_COUNT,
  color = '#9370DB',
}: AudioWaveformProps) {
  const [hasPermission, setHasPermission] = useState(false);

  // Use ref to store bar heights as regular numbers (not SharedValues)
  // Each AnimatedBar will have its own SharedValue
  const barHeightsRef = useRef<number[]>(Array.from({ length: barCount }, () => MIN_HEIGHT));

  // Force re-render when bars update
  const [, forceUpdate] = useState(0);

  // Request permission on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      requestRecordingPermissionsAsync().then(({ granted }) => {
        setHasPermission(granted);
      });
    } else {
      setHasPermission(true);
    }
  }, []);

  // Listen to audio samples
  useAudioSampleListener(player, (sample) => {
    if (!isPlaying || !sample.channels?.[0]?.frames) return;

    const frames = sample.channels[0].frames;
    const chunkSize = Math.floor(frames.length / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const startIdx = i * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, frames.length);

      for (let j = startIdx; j < endIdx; j++) {
        sum += frames[j] * frames[j];
      }

      const rms = Math.sqrt(sum / (endIdx - startIdx));
      barHeightsRef.current[i] = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, rms * MAX_HEIGHT * 4));
    }

    forceUpdate((n) => n + 1);
  });

  // Reset bars when not playing
  useEffect(() => {
    if (!isPlaying) {
      barHeightsRef.current = barHeightsRef.current.map(() => MIN_HEIGHT);
      forceUpdate((n) => n + 1);
    }
  }, [isPlaying]);

  if (!hasPermission && Platform.OS === 'android') {
    return null;
  }

  return (
    <View style={styles.container}>
      {barHeightsRef.current.map((targetHeight, index) => (
        <AnimatedBar key={index} targetHeight={targetHeight} color={color} />
      ))}
    </View>
  );
});

/**
 * Individual animated bar - each has its own SharedValue
 */
const AnimatedBar = memo(function AnimatedBar({
  targetHeight,
  color,
}: {
  targetHeight: number;
  color: string;
}) {
  const height = useSharedValue(MIN_HEIGHT);

  // Animate to target height when it changes
  useEffect(() => {
    height.value = withSpring(targetHeight, {
      damping: 15,
      stiffness: 200,
      mass: 0.5,
    });
  }, [targetHeight, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MAX_HEIGHT,
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: MIN_HEIGHT,
  },
});
