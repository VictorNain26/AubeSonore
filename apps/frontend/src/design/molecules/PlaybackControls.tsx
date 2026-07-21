import { motion, AnimatePresence } from 'motion/react';
import { Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggle as toggleTransition } from '../../lib/motion';

// Play / stop button, subscribing directly to usePlayer. The single flat
// accent block of the scene — the central gesture, deliberately alone.

/** Presentational props for the central play/stop control. */
export interface PlaybackControlsViewProps {
  /** Whether the stream is currently playing. */
  isPlaying: boolean;
  /** Toggles play/stop. */
  onTogglePlay: () => void;
}

export function PlaybackControlsView({ isPlaying, onTogglePlay }: PlaybackControlsViewProps) {
  return (
    <motion.button
      onClick={onTogglePlay}
      transition={toggleTransition}
      className={cn(
        'size-14 lg:size-16 rounded-full flex items-center justify-center shrink-0 cursor-pointer',
        'bg-accent text-on-accent hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-80'
      )}
      aria-label={isPlaying ? 'Arrêter la lecture' : 'Lancer la lecture'}
      aria-pressed={isPlaying}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isPlaying ? (
          <motion.span
            key="stop"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={toggleTransition}
          >
            <Square className="size-5" />
          </motion.span>
        ) : (
          <motion.span
            key="play"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={toggleTransition}
          >
            <Play className="size-6 ml-0.5" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
