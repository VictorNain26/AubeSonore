import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import * as i18n from '@/paraglide/messages.js';
import type { useInkFlip } from '../../lib/motion';

export interface TrackMetaViewProps {
  inkFlip: ReturnType<typeof useInkFlip>;
  title: string | undefined;
  artist: string | undefined;
  shId: number | undefined;
  onArtistInfo?: (() => void) | undefined;
}

export function TrackMetaView({ inkFlip, title, artist, shId, onArtistInfo }: TrackMetaViewProps) {
  // A title wrapping to a different line count changes the block height:
  // measure the content and transition the wrapper's height so everything
  // below (transport, waveform) slides instead of jumping mid-crossfade.
  // The global reduced-motion media query zeroes the CSS transition.
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="ease-out-quart -mb-1 overflow-hidden transition-[height] duration-600"
      style={height !== undefined ? { height } : undefined}
    >
      <div ref={contentRef} className="pb-1">
        <AnimatePresence mode="wait" initial={false}>
          <m.h2
            key={shId ?? 'waiting'}
            {...inkFlip}
            title={title || undefined}
            className="font-display text-title lg:text-display text-text font-medium [text-wrap:balance]"
          >
            {title || i18n.player_loading_live()}
          </m.h2>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <m.p key={artist ?? 'waiting'} {...inkFlip} className="text-lead text-text-muted">
            {onArtistInfo && artist ? (
              <button
                onClick={onArtistInfo}
                className="decoration-border hover:decoration-text focus-visible:outline-accent cursor-pointer rounded-sm underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {artist}
              </button>
            ) : (
              (artist ?? '—')
            )}
          </m.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
