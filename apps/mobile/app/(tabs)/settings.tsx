import { View, Text, Pressable, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { useAuthStore } from '../../src/stores/authStore';
import { useLikedTracksStore } from '../../src/stores/likedTracksStore';
import { usePreferencesStore } from '../../src/stores/preferencesStore';
import { useAudio } from '../../src/providers/AudioProvider';

// ─────────────────────────────────────────────
// Setting Item Component
// ─────────────────────────────────────────────

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  destructive,
}: SettingItemProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center py-4 px-4 active:bg-white/5"
    >
      <View
        className={`w-9 h-9 rounded-lg items-center justify-center mr-3 ${
          destructive ? 'bg-red-500/20' : 'bg-white/5'
        }`}
      >
        <Ionicons name={icon} size={18} color={destructive ? '#ef4444' : 'rgba(255,255,255,0.6)'} />
      </View>
      <View className="flex-1">
        <Text className={`text-base ${destructive ? 'text-red-400' : 'text-white'}`}>{title}</Text>
        {subtitle && <Text className="text-xs text-white/40 mt-0.5">{subtitle}</Text>}
      </View>
      {rightElement ||
        (onPress && <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />)}
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Section Component
// ─────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View className="mb-6">
      <Text className="text-xs text-white/40 uppercase tracking-wider px-4 mb-2">{title}</Text>
      <View className="bg-surface-elevated rounded-xl overflow-hidden">{children}</View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();

  // Auth state
  const { user, isAuthenticated, signOut } = useAuthStore();

  // Clear other stores on logout
  const clearTracks = useLikedTracksStore((state) => state.clearTracks);
  const clearPreferences = usePreferencesStore((state) => state.clearPreferences);
  const { stop: stopPlayer } = useAudio();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  // Handle logout
  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          stopPlayer();
          await signOut();
          clearTracks();
          clearPreferences();
        },
      },
    ]);
  };

  // Handle external links
  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', "Impossible d'ouvrir le lien");
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-8 pt-4">
          <View className="w-20 h-20 rounded-full bg-accent/20 items-center justify-center mb-4">
            {isAuthenticated && user ? (
              <Text className="text-3xl font-bold text-accent">
                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <Ionicons name="person" size={36} color="#9370DB" />
            )}
          </View>
          {isAuthenticated && user ? (
            <>
              <Text className="text-xl font-semibold text-white">{user.name || 'Utilisateur'}</Text>
              <Text className="text-sm text-white/50 mt-1">{user.email}</Text>
            </>
          ) : (
            <>
              <Text className="text-xl font-semibold text-white">Non connecté</Text>
              <Pressable
                onPress={() => router.push('/auth')}
                className="mt-3 bg-accent px-5 py-2 rounded-full active:opacity-80"
              >
                <Text className="text-white font-medium">Se connecter</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Account Section */}
        {isAuthenticated && (
          <Section title="Compte">
            <SettingItem icon="person-outline" title="Profil" subtitle={user?.email} />
            <View className="h-px bg-white/5 mx-4" />
            <SettingItem
              icon="log-out-outline"
              title="Se déconnecter"
              onPress={handleLogout}
              destructive
            />
          </Section>
        )}

        {/* About Section */}
        <Section title="À propos">
          <SettingItem
            icon="radio-outline"
            title="Aube Sonore"
            subtitle="La radio qui vous accompagne"
          />
          <View className="h-px bg-white/5 mx-4" />
          <SettingItem
            icon="globe-outline"
            title="Site web"
            onPress={() => openLink('https://aubesonore.fr')}
          />
          <View className="h-px bg-white/5 mx-4" />
          <SettingItem
            icon="information-circle-outline"
            title="Version"
            rightElement={<Text className="text-sm text-white/40">{appVersion}</Text>}
          />
        </Section>

        {/* Legal Section */}
        <Section title="Légal">
          <SettingItem
            icon="document-text-outline"
            title="Conditions d'utilisation"
            onPress={() => openLink('https://aubesonore.fr/terms')}
          />
          <View className="h-px bg-white/5 mx-4" />
          <SettingItem
            icon="shield-outline"
            title="Politique de confidentialité"
            onPress={() => openLink('https://aubesonore.fr/privacy')}
          />
        </Section>

        {/* Footer */}
        <View className="items-center py-8">
          <Text className="text-xs text-white/20">Aube Sonore © {new Date().getFullYear()}</Text>
          <Text className="text-xs text-white/20 mt-1">Fait avec ❤️ en France</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
