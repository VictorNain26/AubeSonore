import { View, Text } from 'react-native';

interface TrackInfoProps {
  title?: string;
  artist?: string;
  playlist?: string;
}

export function TrackInfo({ title, artist, playlist }: TrackInfoProps) {
  return (
    <View className="items-center px-4">
      <Text className="text-lg font-medium text-white text-center" numberOfLines={1}>
        {title || 'En attente...'}
      </Text>
      <Text className="text-sm text-white/60 text-center mt-0.5" numberOfLines={1}>
        {artist || '—'}
      </Text>
      {playlist && (
        <View className="mt-3 px-3 py-1 bg-white/5 rounded-full flex-row items-center gap-1.5">
          <Text className="text-xs text-white/40">{playlist.replace(/_/g, ' ')}</Text>
        </View>
      )}
    </View>
  );
}
