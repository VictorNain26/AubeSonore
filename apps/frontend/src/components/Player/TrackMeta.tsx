import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useInkFlip } from '../../lib/motion';

// The masthead: track title as a large serif headline, artist as its
// dek. On a track flip the block does a soft crossfade with a slight
// blur — "mise au net" — no translation, no delay.

interface TrackMetaProps {
  onArtistInfo?: (() => void) | undefined;
}

export function TrackMeta({ onArtistInfo }: TrackMetaProps) {
  const inkFlip = useInkFlip();
  const { shId, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      shId: s.data?.now_playing?.sh_id,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );

  return (
    <div className="min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        <motion.h2
          key={shId ?? 'waiting'}
          {...inkFlip}
          className="font-display text-title lg:text-display text-ink [text-wrap:balance]"
        >
          {title || 'Chargement du direct'}
        </motion.h2>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={artist ?? 'waiting'}
          {...inkFlip}
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
