import { memo, useState, useCallback } from 'react';
import { View, Text, Pressable, Linking, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { getPreferredLink } from '@aubesonore/core/share';
import type { LikedTrack, PreferredPlatform } from '../types';

// ─────────────────────────────────────────────
// Component (Memoized for list performance)
// ─────────────────────────────────────────────

interface TrackCardProps {
  track: LikedTrack;
  preferredPlatform: PreferredPlatform;
  onDelete: (id: string) => void;
}

export const TrackCard = memo(function TrackCard({
  track,
  preferredPlatform,
  onDelete,
}: TrackCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const artwork = imgError ? null : track.artworkUrl;
  const { url: link, isSearch } = getPreferredLink(track, preferredPlatform);

  const handleOpen = useCallback(() => {
    try {
      void Linking.openURL(link);
    } catch (error) {
      console.warn('Failed to open URL:', error);
    }
  }, [link]);

  const handleLongPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Supprimer', `Retirer "${track.title}" de vos favoris ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          setIsDeleting(true);
          void onDelete(track.id);
        },
      },
    ]);
  }, [onDelete, track.id, track.title]);

  const handleImageError = useCallback(() => {
    setImgError(true);
  }, []);

  return (
    <Pressable
      onLongPress={handleLongPress}
      disabled={isDeleting}
      className={`flex-row items-center gap-3 py-3 ${isDeleting ? 'opacity-50' : ''}`}
    >
      {/* Artwork */}
      <View className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 items-center justify-center">
        {artwork ? (
          <Image
            source={{ uri: artwork }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onError={handleImageError}
          />
        ) : (
          <Ionicons name="musical-notes" size={20} color="rgba(255,255,255,0.3)" />
        )}
      </View>

      {/* Track info */}
      <View className="flex-1 min-w-0">
        <Text className="text-sm text-white" numberOfLines={1}>
          {track.title}
        </Text>
        <Text className="text-xs text-white/50" numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      {/* Open link action */}
      <Pressable onPress={() => handleOpen()} className="p-2 rounded-full active:bg-white/10">
        <Ionicons
          name={isSearch ? 'search' : 'open-outline'}
          size={18}
          color="rgba(255,255,255,0.5)"
        />
      </Pressable>
    </Pressable>
  );
});
