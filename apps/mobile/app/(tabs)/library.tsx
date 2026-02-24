import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '../../src/stores/authStore';
import { useLikedTracksStore } from '../../src/stores/likedTracksStore';
import { usePreferencesStore } from '../../src/stores/preferencesStore';
import { TrackCard, LoadingSpinner, EmptyState, PlatformSelector } from '../../src/components';
import {
  exportAsCSV,
  exportAsTuneMyMusic,
  exportAsSonglinkList,
} from '../../src/lib/exportLibrary';
import { trackApi } from '../../src/services/api';
import type { LikedTrack } from '../../src/types';

// ─────────────────────────────────────────────
// Extracted FlatList helpers (avoid recreating on every render)
// ─────────────────────────────────────────────

const getTrackKey = (item: LikedTrack) => item.id;
const ItemSeparator = () => <View className="h-px bg-white/5" />;

export default function LibraryScreen() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshingLinks, setIsRefreshingLinks] = useState(false);

  // Auth state
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Liked tracks state
  const { tracks, isLoading: tracksLoading, fetchTracks, unlikeTrack } = useLikedTracksStore();

  // Preferences state
  const {
    preferences,
    fetchPreferences,
    updatePreferredPlatform,
    isLoading: prefsLoading,
  } = usePreferencesStore();

  const preferredPlatform = preferences?.preferredPlatform || 'spotify';

  // Sort newest first
  const sortedTracks = useMemo(
    () =>
      [...tracks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tracks]
  );

  // Fetch data on mount when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTracks();
      fetchPreferences();
    }
  }, [isAuthenticated, fetchTracks, fetchPreferences]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (isAuthenticated) {
      fetchTracks();
      fetchPreferences();
    }
  }, [isAuthenticated, fetchTracks, fetchPreferences]);

  // Handle overflow menu (refresh + export options)
  const handleOverflowMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Options', undefined, [
      {
        text: 'Rafraîchir les liens',
        onPress: async () => {
          setIsRefreshingLinks(true);
          try {
            const result = await trackApi.refreshAllLinks();
            Alert.alert('Liens rafraîchis', `${result.updated} morceaux mis à jour`);
            fetchTracks();
          } catch {
            Alert.alert('Erreur', 'Impossible de rafraîchir les liens');
          } finally {
            setIsRefreshingLinks(false);
          }
        },
      },
      {
        text: 'Exporter CSV',
        onPress: async () => {
          setIsExporting(true);
          try {
            await exportAsCSV(tracks);
          } catch {
            Alert.alert('Erreur', "Impossible d'exporter");
          } finally {
            setIsExporting(false);
          }
        },
      },
      {
        text: 'Exporter TuneMyMusic',
        onPress: async () => {
          setIsExporting(true);
          try {
            await exportAsTuneMyMusic(tracks);
          } catch {
            Alert.alert('Erreur', "Impossible d'exporter");
          } finally {
            setIsExporting(false);
          }
        },
      },
      {
        text: 'Exporter Liens Songlink',
        onPress: async () => {
          setIsExporting(true);
          try {
            await exportAsSonglinkList(tracks);
          } catch {
            Alert.alert('Erreur', "Impossible d'exporter");
          } finally {
            setIsExporting(false);
          }
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }, [tracks, fetchTracks]);

  // Render track item
  const renderTrackItem = useCallback(
    ({ item }: { item: LikedTrack }) => (
      <TrackCard track={item} preferredPlatform={preferredPlatform} onDelete={unlikeTrack} />
    ),
    [preferredPlatform, unlikeTrack]
  );

  // Show loading while checking auth
  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-2xl bg-white/5 items-center justify-center mb-6">
            <Ionicons name="heart" size={40} color="rgba(255,255,255,0.3)" />
          </View>
          <Text className="text-xl font-semibold text-white mb-2 text-center">Vos favoris</Text>
          <Text className="text-sm text-white/50 text-center mb-8 max-w-[280px]">
            Connectez-vous pour sauvegarder vos morceaux préférés et les retrouver sur vos
            plateformes de streaming
          </Text>
          <Pressable
            onPress={() => router.push('/auth')}
            className="bg-accent px-6 py-3 rounded-full active:opacity-80"
          >
            <Text className="text-white font-medium">Se connecter</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Authenticated - show library
  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top']}>
      {/* Header */}
      <View className="px-5 py-4 border-b border-white/10">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center">
              <Ionicons name="heart" size={20} color="rgba(255,255,255,0.6)" />
            </View>
            <View>
              <Text className="text-lg font-semibold text-white">Mes Favoris</Text>
              <Text className="text-xs text-white/40">
                {tracks.length} {tracks.length > 1 ? 'titres' : 'titre'}
              </Text>
            </View>
          </View>

          {/* Overflow menu */}
          {tracks.length > 0 && (
            <Pressable
              onPress={handleOverflowMenu}
              disabled={isRefreshingLinks || isExporting}
              className="w-9 h-9 rounded-lg bg-white/5 items-center justify-center active:bg-white/10"
            >
              {isRefreshingLinks || isExporting ? (
                <ActivityIndicator size="small" color="#9370DB" />
              ) : (
                <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.5)" />
              )}
            </Pressable>
          )}
        </View>

        {/* Platform selector */}
        {tracks.length > 0 && (
          <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-white/5">
            <Text className="text-xs text-white/40">Ouvrir avec</Text>
            <PlatformSelector selected={preferredPlatform} onChange={updatePreferredPlatform} />
          </View>
        )}
      </View>

      {/* Content */}
      {tracksLoading && tracks.length === 0 ? (
        <LoadingSpinner />
      ) : tracks.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Aucun favori"
          description="Appuyez sur le coeur pour sauvegarder les morceaux que vous aimez"
        />
      ) : (
        <FlatList
          data={sortedTracks}
          renderItem={renderTrackItem}
          keyExtractor={getTrackKey}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl
              refreshing={tracksLoading || prefsLoading}
              onRefresh={handleRefresh}
              tintColor="#9370DB"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
