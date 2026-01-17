import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ListenerCountProps {
  count: number;
}

export function ListenerCount({ count }: ListenerCountProps) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name="people" size={14} color="rgba(255,255,255,0.5)" />
      <Text className="text-xs text-white/50">{count}</Text>
    </View>
  );
}
