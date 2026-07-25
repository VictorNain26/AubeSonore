import { Airplay } from 'lucide-react';
import * as m from '@/paraglide/messages.js';
import { cn } from '@/lib/utils';
import { Button } from '../atoms/Button';

export interface AirPlayButtonViewProps {
  /** Diffusion AirPlay actuellement active. */
  isActive: boolean;
  /** Appelé au clic pour ouvrir le sélecteur de périphérique AirPlay. */
  onOpenPicker: () => void;
}

export function AirPlayButtonView({ isActive, onOpenPicker }: AirPlayButtonViewProps) {
  return (
    <Button
      variant="icon"
      onClick={onOpenPicker}
      className={cn(isActive && 'text-accent hover:text-accent')}
      aria-label={isActive ? m.airplay_active() : m.airplay_open()}
    >
      <span className="flex flex-col items-center gap-0.5">
        <Airplay className="size-5" />
        {isActive && <span className="size-1 rounded-full bg-accent" />}
      </span>
    </Button>
  );
}
