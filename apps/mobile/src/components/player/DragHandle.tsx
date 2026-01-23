import { memo } from 'react';
import { View } from 'react-native';

export const DragHandle = memo(function DragHandle() {
  return (
    <View className="items-center py-3">
      <View className="w-10 h-1 rounded-full bg-white/30" />
    </View>
  );
});
