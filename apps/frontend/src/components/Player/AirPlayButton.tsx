import { useEffect } from 'react';
import { Airplay } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../../design/atoms/Button';
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
    <Button
      variant="icon"
      onClick={openPicker}
      className={cn(isActive && 'text-accent hover:text-accent')}
      aria-label={isActive ? 'Diffusion AirPlay active' : 'Diffuser via AirPlay'}
    >
      <span className="flex flex-col items-center gap-0.5">
        <Airplay className="size-5" />
        {isActive && <span className="size-1 rounded-full bg-accent" />}
      </span>
    </Button>
  );
}
