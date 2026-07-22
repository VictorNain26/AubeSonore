import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { useInkFlip } from '../../lib/motion';

/** Presentational props for the now-playing masthead (title + artist only). */
export interface TrackMetaViewProps {
  /** Motion props (initial/animate/exit/transition) applied to each crossfading block. */
  inkFlip: ReturnType<typeof useInkFlip>;
  /** Track title, or `undefined` while waiting for the first now-playing payload. */
  title: string | undefined;
  /** Track artist, or `undefined` while waiting for the first now-playing payload. */
  artist: string | undefined;
  /** AzuraCast `sh_id` used as the crossfade key for the title block. */
  shId: number | undefined;
  /** Opens artist info when the artist name is clicked; omit to render plain text. */
  onArtistInfo?: (() => void) | undefined;
}

export function TrackMetaView({ inkFlip, title, artist, shId, onArtistInfo }: TrackMetaViewProps) {
  return (
    <div className="min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        <m.h2
          key={shId ?? 'waiting'}
          {...inkFlip}
          title={title || undefined}
          className="font-display text-title lg:text-display font-medium text-text [text-wrap:balance] line-clamp-2"
        >
          {title || 'Chargement du direct'}
        </m.h2>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <m.p
          key={artist ?? 'waiting'}
          {...inkFlip}
          className="mt-1 lg:mt-2 text-lead text-text-muted"
        >
          {onArtistInfo && artist ? (
            <button
              onClick={onArtistInfo}
              className="cursor-pointer underline decoration-border underline-offset-4 hover:decoration-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-sm transition-colors"
            >
              {artist}
            </button>
          ) : (
            (artist ?? '—')
          )}
        </m.p>
      </AnimatePresence>
    </div>
  );
}
