import { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface SimpleWaveformProps {
  isPlaying: boolean;
  barCount?: number;
  color?: string;
  progress?: number;
}

const BAR_COUNT = 32;
const MIN_HEIGHT = 0.15;

/**
 * Simple animated waveform visualization
 * Doesn't require audio data - just creates a nice visual effect
 */
export const SimpleWaveform = memo(function SimpleWaveform({
  isPlaying,
  barCount = BAR_COUNT,
  color = '#9370DB',
  progress = 0,
}: SimpleWaveformProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: barCount }).map((_, index) => (
        <AnimatedBar
          key={index}
          index={index}
          total={barCount}
          isPlaying={isPlaying}
          color={color}
          isPassed={progress > 0 && (index / barCount) * 100 < progress}
        />
      ))}
    </View>
  );
});

interface AnimatedBarProps {
  index: number;
  total: number;
  isPlaying: boolean;
  color: string;
  isPassed: boolean;
}

const AnimatedBar = memo(function AnimatedBar({
  index,
  total,
  isPlaying,
  color,
  isPassed,
}: AnimatedBarProps) {
  const height = useSharedValue(MIN_HEIGHT + Math.random() * 0.2);

  useEffect(() => {
    if (isPlaying) {
      // Create unique animation for each bar
      const baseDelay = (index % 8) * 50;
      const duration = 400 + Math.random() * 300;

      // Random target heights for variation
      const minH = 0.2 + Math.random() * 0.1;
      const maxH = 0.6 + Math.random() * 0.3;

      height.value = withDelay(
        baseDelay,
        withRepeat(
          withSequence(
            withTiming(maxH, { duration, easing: Easing.inOut(Easing.ease) }),
            withTiming(minH, { duration, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    } else {
      // Calm breathing animation when stopped
      cancelAnimation(height);
      const position = index / total;
      const baseHeight = 0.25 + Math.sin(position * Math.PI) * 0.1;

      height.value = withRepeat(
        withSequence(
          withTiming(baseHeight + 0.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(baseHeight - 0.05, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }

    return () => {
      cancelAnimation(height);
    };
    // height is a SharedValue (ref-like, stable identity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, index, total]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${height.value * 100}%`,
    backgroundColor: isPassed ? color : 'rgba(255,255,255,0.15)',
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 2,
  },
  bar: {
    flex: 1,
    maxWidth: 4,
    borderRadius: 2,
    minHeight: 4,
  },
});
