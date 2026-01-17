import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { PreferredPlatform } from '../types';

// ─────────────────────────────────────────────
// Platform Definitions
// ─────────────────────────────────────────────

export const PLATFORMS: { id: PreferredPlatform; name: string }[] = [
  { id: 'spotify', name: 'Spotify' },
  { id: 'appleMusic', name: 'Apple Music' },
  { id: 'deezer', name: 'Deezer' },
  { id: 'youtubeMusic', name: 'YouTube Music' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'tidal', name: 'Tidal' },
  { id: 'amazonMusic', name: 'Amazon Music' },
  { id: 'soundcloud', name: 'SoundCloud' },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

interface PlatformSelectorProps {
  selected: PreferredPlatform;
  onChange: (platform: PreferredPlatform) => void;
}

export function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedPlatform = PLATFORMS.find((p) => p.id === selected);

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="flex-row items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10"
      >
        <Text className="text-sm text-white/60">{selectedPlatform?.name}</Text>
        <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.4)" />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/60"
          onPress={() => setIsOpen(false)}
        >
          <View className="flex-1 justify-end">
            <View className="bg-surface-elevated rounded-t-3xl border-t border-white/10">
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/10">
                <Text className="text-lg font-medium text-white">
                  Choisir une plateforme
                </Text>
                <Pressable onPress={() => setIsOpen(false)} className="p-2">
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
                </Pressable>
              </View>

              {/* Platform List */}
              <ScrollView className="max-h-[400px]">
                {PLATFORMS.map((platform) => (
                  <Pressable
                    key={platform.id}
                    onPress={() => {
                      onChange(platform.id);
                      setIsOpen(false);
                    }}
                    className={`flex-row items-center justify-between px-5 py-4 border-b border-white/5 ${
                      selected === platform.id ? 'bg-white/5' : ''
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        selected === platform.id ? 'text-white' : 'text-white/60'
                      }`}
                    >
                      {platform.name}
                    </Text>
                    {selected === platform.id && (
                      <Ionicons name="checkmark" size={20} color="#9370DB" />
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              {/* Safe area bottom padding */}
              <View className="h-8" />
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
