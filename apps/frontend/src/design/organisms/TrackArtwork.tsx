import { Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type { useInkFlip } from '../../lib/motion';

/** Presentational props for the now-playing album art. */
export interface TrackArtworkViewProps {
  /** Cover image URL, or `undefined` while waiting for the first now-playing payload. */
  artUrl: string | undefined;
  /** Track title, used as the image's alt text. */
  title: string | undefined;
  /** Whether to render the placeholder music icon instead of the image. */
  isDefaultCover: boolean;
  /** Whether the antenna is currently playing (drives the subtle scale). */
  isPlaying: boolean;
  /** Called when the cover image fails to load. */
  onArtError: () => void;
  /** Motion props (initial/animate/exit/transition) applied to the crossfading cover. */
  inkFlip: ReturnType<typeof useInkFlip>;
}

export function TrackArtworkView({
  artUrl,
  title,
  isDefaultCover,
  isPlaying,
  onArtError,
  inkFlip,
}: TrackArtworkViewProps) {
  return (
    <div key={artUrl} className="w-full">
      <div
        className={cn(
          'relative aspect-square w-full overflow-hidden rounded-md bg-surface-raised',
          'transition-transform duration-250 ease-out-quart',
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
              onError={onArtError}
              {...inkFlip}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-surface-raised">
              <Music className="size-12 text-text-faint" />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
