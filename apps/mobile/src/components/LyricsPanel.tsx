import { useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useLyrics } from '../hooks/useLyrics';
import { findCurrentLine } from '../lib/lrcParser';

interface LyricsPanelProps {
  artist: string | undefined;
  title: string | undefined;
  elapsed: number;
  isVisible: boolean;
}

const LINE_HEIGHT = 32;

export function LyricsPanel({ artist, title, elapsed, isVisible }: LyricsPanelProps) {
  const { syncedLines, plainLyrics, isLoading, hasSynced } = useLyrics(artist, title);
  const scrollRef = useRef<ScrollView>(null);

  const currentLineIndex = useMemo(
    () => (hasSynced && syncedLines ? findCurrentLine(syncedLines, elapsed) : -1),
    [syncedLines, elapsed, hasSynced]
  );

  // Auto-scroll to current line
  useEffect(() => {
    if (currentLineIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: Math.max(0, currentLineIndex * LINE_HEIGHT - LINE_HEIGHT * 2),
        animated: true,
      });
    }
  }, [currentLineIndex]);

  if (!isVisible) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
      <View className="mx-4 mt-4 bg-white/5 rounded-2xl border border-white/10 overflow-hidden max-h-[200px]">
        {isLoading && (
          <View className="py-8 items-center">
            <ActivityIndicator size="small" color="#9370DB" />
            <Text className="text-xs text-white/30 mt-2">Recherche des paroles...</Text>
          </View>
        )}

        {!isLoading && hasSynced && syncedLines && (
          <ScrollView
            ref={scrollRef}
            className="px-4 py-3"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {syncedLines.map((line, i) => (
              <Text
                key={`${line.time}-${i}`}
                style={{ height: LINE_HEIGHT, lineHeight: LINE_HEIGHT }}
                className={`text-sm ${
                  i === currentLineIndex ? 'text-white font-semibold' : 'text-white/30'
                }`}
                numberOfLines={1}
              >
                {line.text}
              </Text>
            ))}
          </ScrollView>
        )}

        {!isLoading && !hasSynced && plainLyrics && (
          <ScrollView
            className="px-4 py-3"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-sm text-white/50 leading-6">{plainLyrics}</Text>
          </ScrollView>
        )}

        {!isLoading && !hasSynced && !plainLyrics && (
          <View className="py-6 items-center">
            <Text className="text-sm text-white/30">Paroles non disponibles</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
