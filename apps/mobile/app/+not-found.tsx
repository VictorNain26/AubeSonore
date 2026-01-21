import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center p-5 bg-surface-base">
        <View className="w-20 h-20 rounded-2xl bg-white/5 items-center justify-center mb-6">
          <Ionicons name="alert-circle-outline" size={40} color="rgba(255,255,255,0.3)" />
        </View>
        <Text className="text-xl font-bold text-white mb-2">Page introuvable</Text>
        <Text className="text-sm text-white/50 text-center mb-6">
          Cette page n&apos;existe pas.
        </Text>
        <Link href="/" className="bg-accent px-6 py-3 rounded-full">
          <Text className="text-white font-medium">Retour à l&apos;accueil</Text>
        </Link>
      </View>
    </>
  );
}
