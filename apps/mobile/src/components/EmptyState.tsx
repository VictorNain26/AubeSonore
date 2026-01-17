import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <View className="w-16 h-16 rounded-2xl bg-white/5 items-center justify-center mb-4">
        <Ionicons name={icon} size={32} color="rgba(255,255,255,0.3)" />
      </View>
      <Text className="text-sm text-white/50 mb-1">{title}</Text>
      {description && (
        <Text className="text-xs text-white/30 text-center max-w-[200px]">
          {description}
        </Text>
      )}
    </View>
  );
}
