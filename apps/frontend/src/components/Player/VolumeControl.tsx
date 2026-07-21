import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../../design/atoms/Button';
import { Slider } from '../../design/atoms/Slider';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
}

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
      aria-label="Contrôle du volume"
    >
      <Button
        variant="icon"
        onClick={onIconClick}
        aria-label={showMuted ? 'Volume — rétablir le son' : 'Volume — couper le son'}
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
            label="Volume"
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

export function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(hover: none)').matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsHovering(true);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    setIsHovering(false);
    closeTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 300);
  };

  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  const handleIconClick = () => {
    if (isMobile) {
      setIsOpen((prev) => !prev);
    } else {
      onToggleMute();
    }
  };

  const isExpanded = isOpen || (!isMobile && isHovering);

  return (
    <VolumeControlView
      volume={volume}
      isMuted={isMuted}
      onVolumeChange={onVolumeChange}
      isExpanded={isExpanded}
      containerRef={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onIconClick={handleIconClick}
    />
  );
}
