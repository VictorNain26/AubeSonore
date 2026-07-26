import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { cn } from '@/lib/utils';
import { CoverGlyph } from '../atoms/CoverGlyph';
import type { useInkFlip } from '../../lib/motion';

/** Presentational props for the now-playing album art. */
export interface TrackArtworkViewProps {
  /** Cover image URL, or `undefined` while waiting for the first now-playing payload. */
  artUrl: string | undefined;
  /** Track title, used as the image's alt text. */
  title: string | undefined;
  /** Chaîne source du hash déterministe du repli `CoverGlyph` (ex. `${artist}|${title}`). */
  seed: string;
  /** Whether to render the placeholder CoverGlyph instead of the image. */
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
  seed,
  isDefaultCover,
  isPlaying,
  onArtError,
  inkFlip,
}: TrackArtworkViewProps) {
  return (
    <div key={artUrl} className="w-full">
      <div
        className={cn(
          'bg-surface-raised relative aspect-square w-full overflow-hidden rounded-md',
          'ease-out-quart transition-transform duration-250',
          isPlaying && 'scale-[1.01]'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isDefaultCover ? (
            <m.img
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
            <div className="bg-surface-raised flex size-full items-center justify-center">
              <CoverGlyph seed={seed} size="md" className="size-full" />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
