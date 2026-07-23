import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { useInkFlip } from '../../lib/motion';

export interface TrackMetaViewProps {
  inkFlip: ReturnType<typeof useInkFlip>;
  title: string | undefined;
  artist: string | undefined;
  shId: number | undefined;
  onArtistInfo?: (() => void) | undefined;
}

export function TrackMetaView({ inkFlip, title, artist, shId, onArtistInfo }: TrackMetaViewProps) {
  return (
    <div className="">
      <AnimatePresence mode="wait" initial={false}>
        <m.h2
          key={shId ?? 'waiting'}
          {...inkFlip}
          title={title || undefined}
          className="font-display text-title lg:text-display font-medium text-text [text-wrap:balance]"
        >
          {title || 'Chargement du direct'}
        </m.h2>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <m.p key={artist ?? 'waiting'} {...inkFlip} className="text-lead text-text-muted">
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
