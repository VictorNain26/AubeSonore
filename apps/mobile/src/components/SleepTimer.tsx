import { useState, useCallback } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';

import { useSleepTimer } from '../stores/sleepTimerStore';

const PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function SleepTimer() {
  const [isOpen, setIsOpen] = useState(false);

  const { isActive, remainingMs, mode, start, startEndOfTrack, cancel } = useSleepTimer(
    useShallow((s) => ({
      isActive: s.isActive,
      remainingMs: s.remainingMs,
      mode: s.mode,
      start: s.start,
      startEndOfTrack: s.startEndOfTrack,
      cancel: s.cancel,
    }))
  );

  const handlePreset = useCallback(
    (minutes: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void start(minutes);
      setIsOpen(false);
    },
    [start]
  );

  const handleEndOfTrack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void startEndOfTrack();
    setIsOpen(false);
  }, [startEndOfTrack]);

  const handleCancel = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void cancel();
    setIsOpen(false);
  }, [cancel]);

  return (
    <>
      {/* Trigger Button */}
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsOpen(true);
        }}
        className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
      >
        <Ionicons
          name="moon-outline"
          size={20}
          color={isActive ? '#9370DB' : 'rgba(255,255,255,0.6)'}
        />
        {/* Active indicator dot */}
        {isActive && <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />}
      </Pressable>

      {/* Timer Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 justify-center items-center"
          onPress={() => setIsOpen(false)}
        >
          <Pressable
            className="w-[85%] max-w-[340px] bg-surface-elevated rounded-2xl overflow-hidden border border-white/10"
            onPress={() => {}}
          >
            {/* Header */}
            <View className="px-5 pt-5 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-accent/20 items-center justify-center">
                  <Ionicons name="moon" size={20} color="#9370DB" />
                </View>
                <View>
                  <Text className="text-lg font-semibold text-white">Minuterie</Text>
                  {isActive && mode === 'timer' && (
                    <Text className="text-sm text-accent">{formatRemaining(remainingMs)}</Text>
                  )}
                  {isActive && mode === 'end-of-track' && (
                    <Text className="text-sm text-accent">Fin du morceau en cours</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Presets */}
            <View className="px-4 pb-2">
              {PRESETS.map((preset) => (
                <Pressable
                  key={preset.minutes}
                  onPress={() => handlePreset(preset.minutes)}
                  className="flex-row items-center justify-between py-3.5 px-2 border-b border-white/5 active:bg-white/5"
                >
                  <Text className="text-base text-white">{preset.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                </Pressable>
              ))}

              {/* End of track option */}
              <Pressable
                onPress={handleEndOfTrack}
                className="flex-row items-center justify-between py-3.5 px-2 border-b border-white/5 active:bg-white/5"
              >
                <Text className="text-base text-white">Fin du morceau</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
              </Pressable>
            </View>

            {/* Cancel / Close */}
            <View className="px-4 pb-4 pt-2">
              {isActive ? (
                <Pressable
                  onPress={handleCancel}
                  className="py-3 rounded-xl bg-red-500/20 items-center active:opacity-80"
                >
                  <Text className="text-red-400 font-medium">Annuler la minuterie</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setIsOpen(false)}
                  className="py-3 rounded-xl bg-white/5 items-center active:opacity-80"
                >
                  <Text className="text-white/60 font-medium">Fermer</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
