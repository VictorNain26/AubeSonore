import { View, Platform, ActivityIndicator } from 'react-native';
import { CastButton as GoogleCastButton } from 'react-native-google-cast';
import { AirplayButton } from 'react-airplay';
import { useCastStore } from '../stores/castStore';

interface CastButtonProps {
  size?: 'small' | 'medium' | 'large';
  tintColor?: string;
  activeTintColor?: string;
}

const SIZES = {
  small: 32,
  medium: 40,
  large: 48,
};

/**
 * Unified cast button component
 * Shows Chromecast on all platforms
 * Shows AirPlay additionally on iOS
 */
export function CastButton({
  size = 'medium',
  tintColor = 'rgba(255, 255, 255, 0.6)',
  activeTintColor = '#9370DB', // Purple when connected
}: CastButtonProps) {
  const { isCasting, isConnecting, castType } = useCastStore();

  const buttonSize = SIZES[size];
  const isIOS = Platform.OS === 'ios';

  // Show loading indicator when connecting
  if (isConnecting) {
    return (
      <View
        style={{
          width: buttonSize,
          height: buttonSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="small" color={tintColor} />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {/* Chromecast Button - Available on all platforms */}
      <GoogleCastButton
        style={{
          width: buttonSize,
          height: buttonSize,
          tintColor: isCasting && castType === 'chromecast' ? activeTintColor : tintColor,
        }}
      />

      {/* AirPlay Button - iOS only */}
      {isIOS && (
        <AirplayButton
          style={{
            width: buttonSize,
            height: buttonSize,
          }}
          tintColor={isCasting && castType === 'airplay' ? activeTintColor : tintColor}
          activeTintColor={activeTintColor}
        />
      )}
    </View>
  );
}
