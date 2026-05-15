import { memo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  elapsed: number;
  duration: number;
  trackId?: string;
}

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function AnimatedProgressBarComponent({ elapsed, duration, trackId }: AnimatedProgressBarProps) {
  const [displayElapsed, setDisplayElapsed] = useState(elapsed);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0);
  const progress = useSharedValue(0);

  // Sync with server elapsed time when it changes (store in ref, don't setState in effect)
  useEffect(() => {
    baseElapsedRef.current = elapsed;
    startTimeRef.current = Date.now();

    // Set initial progress
    if (duration > 0) {
      const initialProgress = Math.min((elapsed / duration) * 100, 100);
      progress.value = initialProgress;
    }
    // progress is a SharedValue (ref-like, stable identity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, duration, trackId]);

  // Smooth animation loop using requestAnimationFrame (like web app)
  useEffect(() => {
    if (duration <= 0) {
      return;
    }

    startTimeRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const deltaSeconds = (now - startTimeRef.current) / 1000;
      const newElapsed = Math.min(baseElapsedRef.current + deltaSeconds, duration);

      setDisplayElapsed(newElapsed);
      progress.value = (newElapsed / duration) * 100;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // progress is a SharedValue (ref-like, stable identity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, trackId]);

  // Animated style for progress bar
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.min(progress.value, 100)}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        <Text style={styles.timeText}>{formatTime(displayElapsed)}</Text>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, animatedStyle]} />
          </View>
        </View>
        <Text style={[styles.timeText, styles.timeTextRight]}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

export const AnimatedProgressBar = memo(AnimatedProgressBarComponent);

const styles = StyleSheet.create({
  container: {
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
  progressBarContainer: {
    flex: 1,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#9370DB',
    borderRadius: 2,
  },
});
