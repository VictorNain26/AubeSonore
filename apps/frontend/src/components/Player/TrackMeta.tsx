import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useNowPlayingStore } from '../../lib/azuracast';
import { trackFlip, stagger } from '../../lib/motion';

// The masthead: track title as a large serif headline, artist as its
// dek. On a track flip the cascade runs artwork → title → artist, one
// stagger beat apart.

interface TrackMetaProps {
  onArtistInfo?: (() => void) | undefined;
}

export function TrackMeta({ onArtistInfo }: TrackMetaProps) {
  const { shId, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      shId: s.data?.now_playing?.sh_id,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );

  return (
    <div className="min-w-0">
      <AnimatePresence mode="wait">
        <motion.h2
          key={shId ?? 'waiting'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } }}
          transition={{ ...trackFlip, delay: stagger }}
          className="font-display text-title lg:text-display text-ink [text-wrap:balance]"
        >
          {title || "L'antenne se prépare"}
        </motion.h2>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.p
          key={artist ?? 'waiting'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
          transition={{ ...trackFlip, delay: stagger * 2 }}
          className="mt-1 lg:mt-2 text-lead text-ink-soft"
        >
          {onArtistInfo && artist ? (
            <button
              onClick={onArtistInfo}
              className="cursor-pointer underline decoration-line underline-offset-4 hover:decoration-ink transition-colors"
            >
              {artist}
            </button>
          ) : (
            (artist ?? '—')
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
