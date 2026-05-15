import { motion, AnimatePresence } from 'framer-motion';
import { useNowPlaying } from '../../lib/azuracast';
import { trackFlip } from './motion-presets';

// Title + artist for the currently playing track. Re-mounted on sh_id
// flip so AnimatePresence can run the trackFlip crossfade.

export function TrackMeta() {
  const { data: np } = useNowPlaying();
  const nowPlaying = np?.now_playing;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={nowPlaying?.sh_id ?? 'waiting'}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={trackFlip}
        className="text-center mb-5"
      >
        <h2 className="text-lg md:text-xl font-medium text-foreground truncate">
          {nowPlaying?.song.title || 'En attente...'}
        </h2>
        <p className="text-sm text-foreground/50 truncate px-2 mt-0.5">
          {nowPlaying?.song.artist || '—'}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
