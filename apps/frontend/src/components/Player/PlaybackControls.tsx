import { useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayer } from '../../lib/player';
import { toggle as toggleTransition } from './motion-presets';

// Play / stop button, subscribing directly to usePlayer.

export function PlaybackControls() {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const play = usePlayer((s) => s.play);
  const stop = usePlayer((s) => s.stop);

  const togglePlay = useCallback(() => {
    if (isPlaying) stop();
    else void play();
  }, [isPlaying, play, stop]);

  return (
    <motion.button
      onClick={togglePlay}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      transition={toggleTransition}
      className={cn(
        'w-16 h-16 rounded-full flex items-center justify-center shrink-0 cursor-pointer',
        'border backdrop-blur-sm',
        isPlaying
          ? 'border-accent/40 bg-accent/15 hover:bg-accent/25 animate-pulse-ring'
          : 'border-foreground/20 bg-foreground/10 hover:bg-foreground/15'
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
            <Square className="w-5 h-5 text-foreground" />
          </motion.span>
        ) : (
          <motion.span
            key="play"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={toggleTransition}
          >
            <Play className="w-7 h-7 text-foreground ml-0.5" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
