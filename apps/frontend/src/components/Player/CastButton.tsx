import { useEffect, useCallback } from 'react';
import { Cast, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCastStore } from '../../stores/castStore';

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
    startAirPlay,
  } = useCastStore();

  // Initialize cast SDK on mount
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Handle click
  const handleClick = useCallback(() => {
    if (isCasting) {
      // If casting, clicking shows picker again to allow switching/stopping
      if (castType === 'chromecast') {
        void startChromecast();
      } else if (castType === 'airplay') {
        void startAirPlay();
      }
      return;
    }

    // Prefer Chromecast when available (more common)
    // User can use Safari's native AirPlay button for AirPlay
    if (chromecastAvailable) {
      void startChromecast();
    } else if (airplayAvailable) {
      void startAirPlay();
    }
  }, [isCasting, castType, chromecastAvailable, airplayAvailable, startChromecast, startAirPlay]);

  // Don't show if no cast options available
  if (!chromecastAvailable && !airplayAvailable) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className={cn(
        'p-2 rounded-md transition-colors cursor-pointer',
        'hover:bg-paper-raised',
        isCasting ? 'text-accent hover:text-accent' : 'text-ink-faint hover:text-ink',
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
