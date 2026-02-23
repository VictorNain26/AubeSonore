import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useArtistInfo } from '../hooks/useArtistInfo';

interface ArtistContextProps {
  artistName: string | undefined;
}

export function ArtistContext({ artistName }: ArtistContextProps) {
  const { data, isLoading } = useArtistInfo(artistName);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
    setIsBioExpanded(false);
  }, []);

  if (!artistName || (!data && !isLoading)) return null;

  return (
    <View className="mx-4 mt-4">
      {/* Toggle Button */}
      <Pressable
        onPress={handleToggle}
        className="flex-row items-center justify-between py-3 px-4 bg-white/5 rounded-xl border border-white/10 active:bg-white/10"
      >
        <View className="flex-row items-center gap-2 flex-1">
          <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.5)" />
          <Text className="text-sm text-white/60" numberOfLines={1}>
            À propos de {artistName}
          </Text>
          {isLoading && <ActivityIndicator size="small" color="#9370DB" />}
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="rgba(255,255,255,0.3)"
        />
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && data && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <View className="mt-2 bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            {/* Bio */}
            {data.bio && (
              <Pressable
                onPress={() => setIsBioExpanded((prev) => !prev)}
                className="px-4 py-3 border-b border-white/5"
              >
                <Text
                  className="text-sm text-white/60 leading-5"
                  numberOfLines={isBioExpanded ? undefined : 3}
                >
                  {data.bio}
                </Text>
                {data.bio.length > 150 && (
                  <Text className="text-xs text-accent mt-1">
                    {isBioExpanded ? 'Voir moins' : 'Voir plus'}
                  </Text>
                )}
              </Pressable>
            )}

            {/* Genre Tags */}
            {data.tags.length > 0 && (
              <View className="px-4 py-3 border-b border-white/5">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {data.tags.slice(0, 6).map((tag) => (
                      <View
                        key={tag}
                        className="px-3 py-1 rounded-full bg-accent/15 border border-accent/20"
                      >
                        <Text className="text-xs text-accent">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Similar Artists */}
            {data.similarArtists.length > 0 && (
              <View className="px-4 py-3">
                <Text className="text-xs text-white/30 mb-2">Artistes similaires</Text>
                <Text className="text-sm text-white/50">
                  {data.similarArtists.slice(0, 5).join(' · ')}
                </Text>
              </View>
            )}

            {/* Listeners */}
            {data.listeners > 0 && (
              <View className="px-4 py-2 border-t border-white/5">
                <Text className="text-xs text-white/20">
                  {data.listeners.toLocaleString('fr-FR')} auditeurs sur Last.fm
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}
