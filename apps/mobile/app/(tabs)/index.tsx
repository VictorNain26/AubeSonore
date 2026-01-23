import { View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-surface-base">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-1 justify-center items-center px-6">
          {/* Logo */}
          <Animated.View entering={FadeIn.duration(600)} className="mb-8">
            <Image
              source={require('../../assets/images/logo.jpg')}
              className="w-56 h-56 rounded-full"
              resizeMode="cover"
            />
          </Animated.View>

          {/* Tagline */}
          <Animated.Text
            entering={FadeIn.duration(600).delay(150)}
            className="text-base text-white/40 text-center italic"
          >
            Explorez. Écoutez. Vibrez.
          </Animated.Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
