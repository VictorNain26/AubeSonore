import { memo, useCallback } from 'react';
import { View, Text, FlatList, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usePlayerStore } from '../../src/stores/playerStore';
import { useLikedTracksStore } from '../../src/stores/likedTracksStore';
import { useLikeToggle } from '../../src/hooks/useLikeToggle';
import { EmptyState } from '../../src/components';
import type { SongEntry, Song } from '../../src/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return `Il y a ${Math.floor(diff / 86400)}j`;
}

// Extracted to avoid creating new function on every render
const getHistoryKey = (item: SongEntry) => `${item.sh_id}-${item.played_at}`;
const ItemSeparator = () => <View className="h-px bg-white/5" />;

// ─────────────────────────────────────────────
// History Item Component (Memoized)
// ─────────────────────────────────────────────

interface HistoryItemProps {
  entry: SongEntry;
  isLiked: boolean;
  onToggleLike: () => void;
}

const HistoryItem = memo(function HistoryItem({ entry, isLiked, onToggleLike }: HistoryItemProps) {
  const { song, played_at } = entry;

  return (
    <View className="flex-row items-center py-3 gap-3">
      {/* Artwork */}
      <View className="w-12 h-12 rounded-lg overflow-hidden bg-white/5">
        {song.art ? (
          <Image source={{ uri: song.art }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="text-sm font-medium text-white" numberOfLines={1}>
          {song.title}
        </Text>
        <Text className="text-xs text-white/50" numberOfLines={1}>
          {song.artist}
        </Text>
        <Text className="text-[10px] text-white/30 mt-0.5">{formatTimeAgo(played_at)}</Text>
      </View>

      {/* Like button */}
      <Pressable
        onPress={onToggleLike}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="w-9 h-9 items-center justify-center"
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={20}
          color={isLiked ? '#ef4444' : 'rgba(255,255,255,0.4)'}
        />
      </Pressable>
    </View>
  );
});

// ─────────────────────────────────────────────
// History Screen
// ─────────────────────────────────────────────

export default function HistoryScreen() {
  const songHistory = usePlayerStore((s) => s.nowPlaying?.song_history) || [];

  const isTrackLiked = useLikedTracksStore((s) => s.isTrackLiked);

  // Use hook for like operations (passing null since we handle individual songs)
  const { likeByInfo, unlikeByInfo } = useLikeToggle(null, { redirectToAuth: false });

  const handleToggleLike = useCallback(
    async (song: Song) => {
      const { title, artist, art } = song;
      const isLiked = isTrackLiked(title, artist);

      if (isLiked) {
        await unlikeByInfo(title, artist);
      } else {
        await likeByInfo(title, artist, art);
      }
    },
    [isTrackLiked, likeByInfo, unlikeByInfo]
  );

  const renderItem = useCallback(
    ({ item }: { item: SongEntry }) => {
      const isLiked = isTrackLiked(item.song.title, item.song.artist);
      return (
        <HistoryItem
          entry={item}
          isLiked={isLiked}
          onToggleLike={() => handleToggleLike(item.song)}
        />
      );
    },
    [isTrackLiked, handleToggleLike]
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top']}>
      {/* Header */}
      <View className="px-5 py-4 border-b border-white/10">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center">
            <Ionicons name="time" size={20} color="rgba(255,255,255,0.6)" />
          </View>
          <View>
            <Text className="text-lg font-semibold text-white">Historique</Text>
            <Text className="text-xs text-white/40">Morceaux récemment joués</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {songHistory.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="Aucun historique"
          description="Les morceaux joués apparaîtront ici"
        />
      ) : (
        <FlatList
          data={songHistory}
          renderItem={renderItem}
          keyExtractor={getHistoryKey}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ItemSeparatorComponent={ItemSeparator}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
