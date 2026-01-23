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
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function initialize() {
      try {
        // Initialize auth and player stores
        await Promise.all([initializeAuth(), initializePlayer()]);

        // Only proceed if still mounted
        if (!isMounted) return;

        // Subscribe to real-time updates
        unsubscribe = subscribeToNowPlaying();

        // Hide splash screen
        if (fontsLoaded) {
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.warn('App initialization error:', error);
        if (isMounted && fontsLoaded) {
          await SplashScreen.hideAsync();
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
      unsubscribe?.();
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
              name="player"
              options={{
                presentation: 'modal',
                headerShown: false,
                animation: 'slide_from_bottom',
                gestureEnabled: true,
                gestureDirection: 'vertical',
                fullScreenGestureEnabled: true,
              }}
            />
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
