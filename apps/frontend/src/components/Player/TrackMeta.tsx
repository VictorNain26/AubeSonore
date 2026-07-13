import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useNowPlayingStore } from '../../lib/azuracast';
import { trackFlip } from './motion-presets';

// Title + artist for the currently playing track. Re-mounted on sh_id
// flip so AnimatePresence can run the trackFlip crossfade.

export function TrackMeta() {
  const { shId, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      shId: s.data?.now_playing?.sh_id,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={shId ?? 'waiting'}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={trackFlip}
        className="text-center mb-5"
      >
        <h2 className="text-lg md:text-xl font-medium text-foreground truncate">
          {title || 'En attente...'}
        </h2>
        <p className="text-sm text-foreground/50 truncate px-2 mt-0.5">{artist || '—'}</p>
      </motion.div>
    </AnimatePresence>
  );
}
