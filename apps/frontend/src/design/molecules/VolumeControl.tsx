import { Volume2, VolumeX } from 'lucide-react';
import * as m from '@/paraglide/messages.js';
import { cn } from '@/lib/utils';
import { Button } from '../atoms/Button';
import { Slider } from '../atoms/Slider';

/** Presentational props for the volume popover control. */
export interface VolumeControlViewProps {
  /** Current volume, 0–1. */
  volume: number;
  /** Whether volume is currently muted. */
  isMuted: boolean;
  /** Called with the new volume, 0–1, as the slider moves. */
  onVolumeChange: (value: number) => void;
  /** Whether the popover slider is visible (hover on desktop, tap-toggled on touch). */
  isExpanded: boolean;
  /** Ref for the outer group, used to detect outside clicks/taps on touch devices. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Opens the popover on desktop hover. */
  onMouseEnter: () => void;
  /** Closes the popover (with a short delay) on desktop hover-out. */
  onMouseLeave: () => void;
  /** Toggles mute on desktop, or toggles popover visibility on touch. */
  onIconClick: () => void;
}

export function VolumeControlView({
  volume,
  isMuted,
  onVolumeChange,
  isExpanded,
  containerRef,
  onMouseEnter,
  onMouseLeave,
  onIconClick,
}: VolumeControlViewProps) {
  const showMuted = isMuted || volume === 0;
  const VolumeIcon = showMuted ? VolumeX : Volume2;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="group"
      aria-label={m.volume_group()}
    >
      <Button
        variant="icon"
        onClick={onIconClick}
        aria-label={showMuted ? m.volume_unmute() : m.volume_mute()}
      >
        <VolumeIcon />
      </Button>

      <div
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
          'transition-[opacity,translate] duration-200 ease-out-quart',
          isExpanded
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none translate-y-2'
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="presentation"
      >
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <Slider
            label={m.volume_slider()}
            orientation="vertical"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onValueChange={onVolumeChange}
          />
        </div>
      </div>
    </div>
  );
}
