import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// VOLUME CONTROL - Expert UX/UI Implementation
// Pattern: Overlay slider (no layout shift)
// Features: 44px touch target, mobile tap toggle, keyboard support, ARIA
// ─────────────────────────────────────────────

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
}

export function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile (no hover)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(hover: none)').matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile || isDragging) return;
    // Delay before closing to allow reaching the slider
    closeTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 300);
  };

  // Sync local volume with prop when not dragging
  useEffect(() => {
    if (!isDragging) setLocalVolume(volume);
  }, [volume, isDragging]);

  // Close slider when clicking outside (mobile)
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

  // Calculate volume from vertical position (bottom = 0, top = 1)
  const calculateVolumeVertical = useCallback(
    (clientY: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      // Invert: top of slider = 100%, bottom = 0%
      const percent = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
      setLocalVolume(percent);
      onVolumeChange(percent);
    },
    [onVolumeChange]
  );

  // Handle drag events (vertical)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      calculateVolumeVertical(e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) calculateVolumeVertical(touch.clientY);
    };
    const handleEnd = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, calculateVolumeVertical]);

  // Keyboard support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 0.1 : 0.05;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const newVolume = Math.min(1, localVolume + step);
        setLocalVolume(newVolume);
        onVolumeChange(newVolume);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const newVolume = Math.max(0, localVolume - step);
        setLocalVolume(newVolume);
        onVolumeChange(newVolume);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onToggleMute();
      }
    },
    [localVolume, onVolumeChange, onToggleMute]
  );

  const handleSliderInteractionVertical = (clientY: number) => {
    setIsDragging(true);
    calculateVolumeVertical(clientY);
  };

  // Icon click: mobile = toggle slider, desktop = mute
  const handleIconClick = () => {
    if (isMobile) {
      setIsOpen((prev) => !prev);
    } else {
      onToggleMute();
    }
  };

  const displayVolume = localVolume;
  const isExpanded = isOpen || isDragging || (!isMobile && containerRef.current?.matches(':hover'));
  const showMuted = isMuted || displayVolume === 0;
  const VolumeIcon = showMuted ? VolumeX : Volume2;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
      aria-label="Volume control"
    >
      {/* Volume Icon Button - Fixed position, never moves */}
      <button
        onClick={handleIconClick}
        className={cn(
          'p-2 rounded-full transition-all duration-200 cursor-pointer',
          'text-white/60 hover:text-white hover:bg-white/10',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
        )}
        aria-label={showMuted ? 'Unmute' : 'Mute'}
        title={isMobile ? 'Volume' : showMuted ? 'Unmute (M)' : 'Mute (M)'}
      >
        <VolumeIcon className="w-5 h-5" />
      </button>

      {/* Slider - Absolute positioned overlay, opens UPWARD */}
      <div
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
          'transition-all duration-200 ease-out',
          isExpanded
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none translate-y-2'
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="bg-black/80 backdrop-blur-md rounded-xl p-3 shadow-lg border border-white/10">
          {/* Vertical Slider Track - wider touch area */}
          <div
            ref={sliderRef}
            className="relative w-8 h-28 rounded-full cursor-pointer flex justify-center touch-none"
            onMouseDown={(e) => handleSliderInteractionVertical(e.clientY)}
            onTouchStart={(e) => {
              e.preventDefault();
              const touch = e.touches[0];
              if (touch) handleSliderInteractionVertical(touch.clientY);
            }}
            role="slider"
            aria-label="Volume"
            aria-valuenow={Math.round(displayVolume * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-orientation="vertical"
          >
            {/* Visual track (narrow) */}
            <div className="relative w-1.5 h-full rounded-full bg-white/20">
              {/* Track Fill (from bottom) */}
              <div
                className={cn(
                  'absolute inset-x-0 bottom-0 rounded-full bg-white/80',
                  !isDragging && 'transition-[height] duration-75'
                )}
                style={{ height: `${displayVolume * 100}%` }}
              />
            </div>

            {/* Thumb */}
            <div
              className="absolute left-1/2 -translate-x-1/2 translate-y-1/2"
              style={{ bottom: `${displayVolume * 100}%` }}
            >
              {/* Visible thumb */}
              <div
                className={cn(
                  'w-4 h-4 rounded-full bg-white shadow-md',
                  'transition-transform duration-150',
                  isDragging && 'scale-110'
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
