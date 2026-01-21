import { useEffect, useCallback } from 'react';
import { Cast, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCastStore } from '../../stores/castStore';
import { showAirPlayPicker } from '../../lib/cast';
import { getAudioElement } from '../../lib/player';

interface CastButtonProps {
  className?: string;
}

/**
 * Cast button for web player
 * Shows Chromecast on all browsers, AirPlay on Safari
 */
export function CastButton({ className }: CastButtonProps) {
  const {
    chromecastAvailable,
    airplayAvailable,
    isCasting,
    isConnecting,
    castType,
    deviceName,
    initialize,
    startChromecast,
  } = useCastStore();

  // Initialize cast SDK on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle click
  const handleClick = useCallback(() => {
    if (isCasting) {
      // If casting, clicking shows options or stops
      // For now, just show the picker again to allow stopping
      if (castType === 'chromecast') {
        startChromecast();
      } else if (castType === 'airplay') {
        const audio = getAudioElement();
        if (audio) {
          showAirPlayPicker(audio);
        }
      }
      return;
    }

    // If both available, prefer Chromecast (more common)
    // User can use Safari's native AirPlay button in the media controls
    if (chromecastAvailable) {
      startChromecast();
    } else if (airplayAvailable) {
      const audio = getAudioElement();
      if (audio) {
        showAirPlayPicker(audio);
      }
    }
  }, [isCasting, castType, chromecastAvailable, airplayAvailable, startChromecast]);

  // Don't show if no cast options available
  if (!chromecastAvailable && !airplayAvailable) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className={cn(
        'p-2 rounded-full transition-all duration-200 cursor-pointer',
        'hover:bg-white/10',
        isCasting ? 'text-purple-400 hover:text-purple-300' : 'text-white/60 hover:text-white',
        isConnecting && 'opacity-50 cursor-wait',
        className
      )}
      title={isCasting ? `Diffusion sur ${deviceName || 'appareil'}` : 'Diffuser'}
      aria-label={isCasting ? 'Arrêter la diffusion' : 'Diffuser sur un appareil'}
    >
      {isConnecting ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Cast className={cn('w-5 h-5', isCasting && 'fill-current')} />
      )}
    </button>
  );
}
