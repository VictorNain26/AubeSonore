import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '../../src/components/MiniPlayer';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Tab bar height including safe area
  const TAB_BAR_HEIGHT = 56;
  const MINI_PLAYER_HEIGHT = 68;

  return (
    <View style={styles.container}>
      {/* Tabs Navigator */}
      <View style={styles.tabsContainer}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: [
              styles.tabBar,
              {
                height: TAB_BAR_HEIGHT + insets.bottom,
                paddingBottom: insets.bottom,
              },
            ],
            tabBarActiveTintColor: '#9370DB',
            tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
            tabBarLabelStyle: styles.tabBarLabel,
            // Leave space for mini-player
            sceneStyle: {
              paddingBottom: MINI_PLAYER_HEIGHT,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Accueil',
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: 'Historique',
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="library"
            options={{
              title: 'Favoris',
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Paramètres',
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? 'settings' : 'settings-outline'}
                  size={24}
                  color={color}
                />
              ),
            }}
          />
        </Tabs>
      </View>

      {/* Mini Player - Fixed above tab bar */}
      <View
        style={[
          styles.miniPlayerContainer,
          {
            bottom: TAB_BAR_HEIGHT + insets.bottom,
          },
        ]}
      >
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1118',
  },
  tabsContainer: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#0f1118',
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  miniPlayerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
