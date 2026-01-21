import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AudioProvider } from '../src/providers/AudioProvider';
import { CastProvider } from '../src/providers/CastProvider';
import { useAuthStore } from '../src/stores/authStore';
import { usePlayerStore } from '../src/stores/playerStore';

import '../global.css';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Font asset path - using require to load the local font file
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SpaceMonoFont = require('../assets/fonts/SpaceMono-Regular.ttf');

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: SpaceMonoFont,
  });

  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializePlayer = usePlayerStore((state) => state.initialize);
  const subscribeToNowPlaying = usePlayerStore((state) => state.subscribeToNowPlaying);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize auth and player stores
        await Promise.all([initializeAuth(), initializePlayer()]);

        // Subscribe to real-time updates
        const unsubscribe = subscribeToNowPlaying();

        // Hide splash screen
        if (fontsLoaded) {
          await SplashScreen.hideAsync();
        }

        return unsubscribe;
      } catch (error) {
        console.error('App initialization error:', error);
        if (fontsLoaded) {
          await SplashScreen.hideAsync();
        }
      }
    }

    const unsubscribePromise = initialize();

    return () => {
      unsubscribePromise.then((unsubscribe) => unsubscribe?.());
    };
  }, [fontsLoaded, initializeAuth, initializePlayer, subscribeToNowPlaying]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CastProvider>
        <AudioProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0f1118' },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="auth"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </Stack>
        </AudioProvider>
      </CastProvider>
    </GestureHandlerRootView>
  );
}
