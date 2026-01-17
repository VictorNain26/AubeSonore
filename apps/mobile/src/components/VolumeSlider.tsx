import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface VolumeSliderProps {
  volume: number;
  onVolumeChange: (value: number) => void;
}

export function VolumeSlider({ volume, onVolumeChange }: VolumeSliderProps) {
  const isMuted = volume === 0;

  const toggleMute = () => {
    onVolumeChange(isMuted ? 0.5 : 0);
  };

  const getVolumeIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isMuted) return 'volume-mute';
    if (volume < 0.3) return 'volume-low';
    if (volume < 0.7) return 'volume-medium';
    return 'volume-high';
  };

  return (
    <View className="flex-row items-center gap-2">
      <Pressable onPress={toggleMute} className="p-2">
        <Ionicons name={getVolumeIcon()} size={20} color="rgba(255,255,255,0.6)" />
      </Pressable>
      <Slider
        style={{ flex: 1, height: 40 }}
        minimumValue={0}
        maximumValue={1}
        value={volume}
        onValueChange={onVolumeChange}
        minimumTrackTintColor="#9370DB"
        maximumTrackTintColor="rgba(255,255,255,0.2)"
        thumbTintColor="#9370DB"
      />
    </View>
  );
}
