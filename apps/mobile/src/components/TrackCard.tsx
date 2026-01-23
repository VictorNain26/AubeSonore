import { memo, useState, useCallback } from 'react';
import { View, Text, Image, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LikedTrack, PreferredPlatform, PlatformLinks } from '../types';

// ─────────────────────────────────────────────
// Helper: Search URLs by platform
// ─────────────────────────────────────────────

function getSearchUrl(platform: PreferredPlatform, query: string): string {
  const encoded = encodeURIComponent(query);
  const urls: Record<PreferredPlatform, string> = {
    spotify: `https://open.spotify.com/search/${encoded}`,
    appleMusic: `https://music.apple.com/search?term=${encoded}`,
    deezer: `https://www.deezer.com/search/${encoded}`,
    youtubeMusic: `https://music.youtube.com/search?q=${encoded}`,
    youtube: `https://www.youtube.com/results?search_query=${encoded}`,
    tidal: `https://listen.tidal.com/search?q=${encoded}`,
    amazonMusic: `https://music.amazon.com/search/${encoded}`,
    soundcloud: `https://soundcloud.com/search?q=${encoded}`,
  };
  return urls[platform];
}

// ─────────────────────────────────────────────
// Helper: Get preferred link
// ─────────────────────────────────────────────

function getPreferredLink(
  track: LikedTrack,
  preferredPlatform: PreferredPlatform
): { url: string; isSearch: boolean } {
  if (track.platformLinks) {
    const platformKey = preferredPlatform === 'youtube' ? 'youtubeMusic' : preferredPlatform;
    const preferred = track.platformLinks[platformKey as keyof PlatformLinks];
    if (preferred) return { url: preferred, isSearch: false };

    const firstAvailable = Object.values(track.platformLinks).find(Boolean);
    if (firstAvailable) return { url: firstAvailable, isSearch: false };
  }

  if (track.songlinkUrl) return { url: track.songlinkUrl, isSearch: false };

  const query = `${track.title} ${track.artist}`;
  return { url: getSearchUrl(preferredPlatform, query), isSearch: true };
}

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

  const artwork = imgError ? null : track.artworkBase64 || track.artworkUrl;
  const { url: link, isSearch } = getPreferredLink(track, preferredPlatform);

  const handleOpen = useCallback(async () => {
    try {
      await Linking.openURL(link);
    } catch (error) {
      console.warn('Failed to open URL:', error);
    }
  }, [link]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    await onDelete(track.id);
  }, [onDelete, track.id]);

  const handleImageError = useCallback(() => {
    setImgError(true);
  }, []);

  return (
    <View className={`flex-row items-center gap-3 py-3 ${isDeleting ? 'opacity-50' : ''}`}>
      {/* Artwork */}
      <View className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 items-center justify-center">
        {artwork ? (
          <Image
            source={{ uri: artwork }}
            className="w-full h-full"
            resizeMode="cover"
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

      {/* Actions */}
      <View className="flex-row items-center gap-1">
        <Pressable onPress={handleOpen} className="p-2 rounded-full active:bg-white/10">
          <Ionicons
            name={isSearch ? 'search' : 'open-outline'}
            size={18}
            color="rgba(255,255,255,0.5)"
          />
        </Pressable>

        <Pressable
          onPress={handleDelete}
          disabled={isDeleting}
          className="p-2 rounded-full active:bg-white/10"
        >
          <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>
    </View>
  );
});
