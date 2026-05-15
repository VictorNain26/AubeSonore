import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDurationMinutes } from '@aubesonore/core/format';

import { useStatsStore } from '../stores/statsStore';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Local alias preserved so the JSX call sites stay untouched (`formatTime(min)`).
const formatTime = formatDurationMinutes;

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 bg-white/5 rounded-xl p-4 items-center">
      <Ionicons name={icon} size={22} color="#9370DB" />
      <Text className="text-xl font-bold text-white mt-2">{value}</Text>
      <Text className="text-xs text-white/40 mt-1 text-center">{label}</Text>
    </View>
  );
}

export function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const getMonthlyStats = useStatsStore((s) => s.getMonthlyStats);
  const stats = getMonthlyStats();

  const maxCount = stats.topArtists.length > 0 ? stats.topArtists[0].count : 1;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-surface-elevated rounded-t-3xl max-h-[85%] border-t border-white/10">
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-white/20" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-accent/20 items-center justify-center">
                <Ionicons name="stats-chart" size={20} color="#9370DB" />
              </View>
              <View>
                <Text className="text-lg font-semibold text-white">Mes statistiques</Text>
                <Text className="text-xs text-white/40">30 derniers jours</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          <ScrollView
            className="px-5 pb-8"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Stat Cards - 2x2 Grid */}
            <View className="flex-row gap-3 mb-3">
              <StatCard
                icon="time-outline"
                label="Temps d'écoute"
                value={formatTime(stats.totalMinutes)}
              />
              <StatCard
                icon="people-outline"
                label="Artistes découverts"
                value={stats.uniqueArtists.toString()}
              />
            </View>
            <View className="flex-row gap-3 mb-6">
              <StatCard
                icon="flame-outline"
                label="Jours consécutifs"
                value={stats.streak.toString()}
              />
              <StatCard
                icon="musical-notes-outline"
                label="Morceaux écoutés"
                value={stats.tracksHeard.toString()}
              />
            </View>

            {/* Top Artists */}
            {stats.topArtists.length > 0 && (
              <View>
                <Text className="text-sm font-medium text-white/60 mb-3">Top artistes</Text>
                {stats.topArtists.map((artist, i) => (
                  <View key={artist.name} className="flex-row items-center gap-3 mb-3">
                    <Text className="text-sm text-white/30 w-5 text-right">{i + 1}</Text>
                    <View className="flex-1">
                      <Text className="text-sm text-white mb-1" numberOfLines={1}>
                        {artist.name}
                      </Text>
                      <View className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${(artist.count / maxCount) * 100}%` }}
                        />
                      </View>
                    </View>
                    <Text className="text-xs text-white/30 w-8 text-right">{artist.count}</Text>
                  </View>
                ))}
              </View>
            )}

            {stats.topArtists.length === 0 && (
              <View className="items-center py-8">
                <Ionicons name="stats-chart-outline" size={40} color="rgba(255,255,255,0.15)" />
                <Text className="text-sm text-white/30 mt-3">
                  Commencez à écouter pour voir vos stats
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
