import { memo, useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

export const LiveIndicator = memo(function LiveIndicator() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.3], [1, 0.5]),
  }));

  return (
    <View className="flex-row items-center gap-2 px-3 py-1.5 bg-red-500/90 rounded-full">
      <Animated.View style={dotStyle} className="w-2 h-2 rounded-full bg-white" />
      <Text className="text-xs font-semibold text-white tracking-wide">EN DIRECT</Text>
    </View>
  );
});
