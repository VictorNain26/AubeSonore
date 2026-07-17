import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useNowPlayingStore } from '../../lib/azuracast';
import { trackFlip } from './motion-presets';

// The masthead: track title as a large serif headline, artist as its
// dek. Only the title crossfades — a single animated element per the
// scene's motion budget.

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
          transition={trackFlip}
          className="font-display text-title lg:text-display text-ink [text-wrap:balance]"
        >
          {title || 'En attente...'}
        </motion.h2>
      </AnimatePresence>
      <p className="mt-1 lg:mt-2 text-lead text-ink-soft">
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
      </p>
    </div>
  );
}
