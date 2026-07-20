import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useNowPlayingStore, isDefaultArtwork } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { useInkFlip } from '../../lib/motion';

// Album art only, subscribing directly to the store it needs. No props:
// the component is self-sufficient.

export function TrackArtwork() {
  const { artUrl, title } = useNowPlayingStore(
    useShallow((s) => ({
      artUrl: s.data?.now_playing?.song.art,
      title: s.data?.now_playing?.song.title,
    }))
  );
  const isPlaying = usePlayer((s) => s.isPlaying);
  const [artError, setArtError] = useState(false);
  const inkFlip = useInkFlip();

  const handleArtError = () => setArtError(true);

  const isDefaultCover = !artUrl || artError || isDefaultArtwork(artUrl);

  return (
    <div key={artUrl} className="w-full">
      <div
        className={cn(
          'relative aspect-square w-full overflow-hidden rounded-lg bg-paper-raised',
          'transition-transform duration-500 ease-(--ease-fluid)',
          isPlaying && 'scale-[1.01]'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isDefaultCover ? (
            <motion.img
              key={artUrl}
              src={artUrl}
              alt={title}
              className="size-full object-cover"
              referrerPolicy="no-referrer"
              decoding="async"
              fetchPriority="high"
              onError={handleArtError}
              {...inkFlip}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-paper-raised">
              <Music className="size-12 text-ink-faint" />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
