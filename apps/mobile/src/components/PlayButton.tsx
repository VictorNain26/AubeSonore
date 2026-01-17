import { Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PlayButtonProps {
  isPlaying: boolean;
  isLoading?: boolean;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { button: 'w-12 h-12', icon: 20 },
  medium: { button: 'w-14 h-14', icon: 24 },
  large: { button: 'w-16 h-16', icon: 28 },
};

export function PlayButton({
  isPlaying,
  isLoading = false,
  onPress,
  size = 'medium',
}: PlayButtonProps) {
  const { button, icon } = SIZES[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className={`${button} rounded-full items-center justify-center border border-white/20 bg-white/5 active:scale-95`}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="white" />
      ) : isPlaying ? (
        <Ionicons name="stop" size={icon} color="white" />
      ) : (
        <Ionicons name="play" size={icon} color="white" style={{ marginLeft: 2 }} />
      )}
    </Pressable>
  );
}
