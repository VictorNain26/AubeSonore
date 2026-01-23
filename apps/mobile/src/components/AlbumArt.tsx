import { useState, useEffect, memo } from 'react';
import { View, Image, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_ARTWORK } from '../config/env';

interface AlbumArtProps {
  artUrl?: string;
  title?: string;
  isPlaying: boolean;
  isLiked: boolean;
  isLiking?: boolean;
  isLive?: boolean;
  onToggleLike: () => void;
}

export const AlbumArt = memo(function AlbumArt({
  artUrl,
  title,
  isPlaying,
  isLiked,
  isLiking = false,
  isLive,
  onToggleLike,
}: AlbumArtProps) {
  const [artError, setArtError] = useState(false);

  // Reset art error when song changes
  useEffect(() => {
    setArtError(false);
  }, [artUrl]);

  // Detect default AzuraCast cover
  const isDefaultCover =
    !artUrl ||
    artError ||
    artUrl.includes('generic') ||
    artUrl.includes('default') ||
    artUrl.includes('placeholder');

  const imageSource = isDefaultCover ? { uri: DEFAULT_ARTWORK } : { uri: artUrl };

  return (
    <View className="relative">
      <View
        className={`w-64 h-64 rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${
          isPlaying ? 'scale-[1.02]' : ''
        }`}
      >
        {!isDefaultCover ? (
          <Image
            source={imageSource}
            className="w-full h-full"
            resizeMode="cover"
            onError={() => setArtError(true)}
          />
        ) : (
          // Elegant fallback
          <View className="relative w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 items-center justify-center">
            {/* Decorative circles */}
            <View className="absolute inset-0 items-center justify-center">
              <View className="absolute w-40 h-40 rounded-full border border-white/5" />
              <View className="absolute w-28 h-28 rounded-full border border-white/5" />
              <View className="absolute w-16 h-16 rounded-full border border-white/10" />
            </View>
            {/* Central icon */}
            <Ionicons name="musical-notes" size={48} color="rgba(255,255,255,0.4)" />
          </View>
        )}

        {/* Like button overlay */}
        {title && (
          <View className="absolute bottom-3 right-3">
            <Pressable
              onPress={onToggleLike}
              disabled={isLiking}
              className={`p-3 rounded-full border ${
                isLiked ? 'bg-red-500 border-red-400' : 'bg-black/60 border-white/20'
              } ${isLiking ? 'opacity-50' : ''}`}
            >
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color="white" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Live indicator */}
      {isLive && (
        <View className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 rounded-full flex-row items-center gap-1 z-10">
          <View className="w-1.5 h-1.5 rounded-full bg-white" />
          <Text className="text-xs font-medium text-white">LIVE</Text>
        </View>
      )}
    </View>
  );
});
