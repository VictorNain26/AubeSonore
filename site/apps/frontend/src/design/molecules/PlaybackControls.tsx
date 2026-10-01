import { Play, Square } from 'lucide-react';
import * as m from '@/paraglide/messages.js';
import { cn } from '@/lib/utils';

// Play / stop button, subscribing directly to usePlayer. The single flat
// accent block of the scene — the central gesture, deliberately alone. The
// glyph swaps instantly on toggle; feedback comes from the press/hover scale.

/** Presentational props for the central play/stop control. */
export interface PlaybackControlsViewProps {
  /** Whether the stream is currently playing. */
  isPlaying: boolean;
  /** Toggles play/stop. */
  onTogglePlay: () => void;
}

export function PlaybackControlsView({ isPlaying, onTogglePlay }: PlaybackControlsViewProps) {
  return (
    <button
      onClick={onTogglePlay}
      className={cn(
        'flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full',
        'bg-accent text-on-accent ease-out-quart transition-transform duration-200',
        'motion-safe:hover:scale-105 motion-safe:active:scale-95',
        'focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2'
      )}
      aria-label={isPlaying ? m.playback_stop() : m.playback_start()}
      aria-pressed={isPlaying}
    >
      {isPlaying ? (
        <Square className="size-5 fill-current" strokeWidth={0} />
      ) : (
        <Play className="ml-0.5 size-6 fill-current" strokeWidth={0} />
      )}
    </button>
  );
}
