import { useEffect } from 'react';
import { Airplay } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from '../ui/Button';
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
    <IconButton
      onClick={openPicker}
      className={cn(isActive && 'text-accent hover:text-accent')}
      label={isActive ? 'Diffusion AirPlay active' : 'Diffuser via AirPlay'}
    >
      <Airplay className="size-5" />
    </IconButton>
  );
}
