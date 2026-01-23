import { memo, useCallback } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

interface LikeButtonProps {
  isLiked: boolean;
  isLoading: boolean;
  onPress: () => void;
}

export const LikeButton = memo(function LikeButton({
  isLiked,
  isLoading,
  onPress,
}: LikeButtonProps) {
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    onPress();
  }, [scale, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={handlePress} disabled={isLoading}>
      <Animated.View
        style={animatedStyle}
        className={`w-12 h-12 rounded-full items-center justify-center ${
          isLiked ? 'bg-red-500' : 'bg-white/10'
        }`}
      >
        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color="white" />
      </Animated.View>
    </Pressable>
  );
});
