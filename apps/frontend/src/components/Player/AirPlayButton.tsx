import { useEffect } from 'react';
import { Airplay } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAirPlayStore } from '../../stores/airplayStore';

export function AirPlayButton() {
  const available = useAirPlayStore((s) => s.available);
  const isActive = useAirPlayStore((s) => s.isActive);
  const initialize = useAirPlayStore((s) => s.initialize);
  const openPicker = useAirPlayStore((s) => s.openPicker);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!available) return null;

  return (
    <button
      onClick={openPicker}
      className={cn(
        'p-2 rounded-md transition-colors cursor-pointer hover:bg-paper-raised',
        isActive ? 'text-accent' : 'text-ink-faint hover:text-ink'
      )}
      title={isActive ? 'Diffusion AirPlay active' : 'Diffuser via AirPlay'}
      aria-label={isActive ? 'Diffusion AirPlay active' : 'Diffuser via AirPlay'}
    >
      <Airplay className="w-5 h-5" />
    </button>
  );
}
