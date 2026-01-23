import { memo, useCallback } from 'react';
import { Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import { useCastStore } from '../stores/castStore';
import { showCastPicker } from '../lib/cast';

interface CastButtonProps {
  size?: 'small' | 'medium' | 'large';
  tintColor?: string;
  activeTintColor?: string;
}

const ICON_SIZES = {
  small: 18,
  medium: 22,
  large: 26,
} as const;

const BUTTON_SIZES = {
  small: 32,
  medium: 40,
  large: 48,
} as const;

export const CastButton = memo(function CastButton({
  size = 'medium',
  tintColor = 'rgba(255, 255, 255, 0.5)',
  activeTintColor = '#9370DB',
}: CastButtonProps) {
  const { chromecastAvailable, isCasting, isConnecting } = useCastStore(
    useShallow((s) => ({
      chromecastAvailable: s.chromecastAvailable,
      isCasting: s.isCasting,
      isConnecting: s.isConnecting,
    }))
  );

  const handlePress = useCallback(() => {
    showCastPicker();
  }, []);

  if (!chromecastAvailable) {
    return null;
  }

  const iconSize = ICON_SIZES[size];
  const buttonSize = BUTTON_SIZES[size];
  const color = isCasting ? activeTintColor : tintColor;

  if (isConnecting) {
    return (
      <Pressable style={[styles.button, { width: buttonSize, height: buttonSize }]} disabled>
        <ActivityIndicator size="small" color={tintColor} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, { width: buttonSize, height: buttonSize }]}
      hitSlop={8}
    >
      <Ionicons name={isCasting ? 'tv' : 'tv-outline'} size={iconSize} color={color} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
