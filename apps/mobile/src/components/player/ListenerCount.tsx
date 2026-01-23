import { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ListenerCountProps {
  count: number;
}

export const ListenerCount = memo(function ListenerCount({ count }: ListenerCountProps) {
  return (
    <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
      <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" />
      <Text className="text-xs font-medium text-white/70">
        {count} {count === 1 ? 'auditeur' : 'auditeurs'}
      </Text>
    </View>
  );
});
