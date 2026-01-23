import { memo, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface PlayerPlayButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPress: () => void;
}

export const PlayerPlayButton = memo(function PlayerPlayButton({
  isPlaying,
  isLoading,
  onPress,
}: PlayerPlayButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isLoading}
        className="w-20 h-20 rounded-full items-center justify-center bg-white"
        style={{
          shadowColor: '#fff',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {isLoading ? (
          <View className="w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        ) : isPlaying ? (
          <Ionicons name="pause" size={36} color="#0f1118" />
        ) : (
          <Ionicons name="play" size={36} color="#0f1118" style={{ marginLeft: 4 }} />
        )}
      </Pressable>
    </Animated.View>
  );
});
