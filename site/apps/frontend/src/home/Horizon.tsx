import { useNowPlayingStore } from '../lib/azuracast';
import { usePlayer } from '../lib/player';
import { HorizonLine } from './HorizonLine';
import * as m from '@/paraglide/messages.js';

export interface HorizonViewProps {
  isPlaying: boolean;
  songId: number | undefined;
}

/**
 * The horizon at the foot of the dawn: the line is the sound of the live
 * stream, the name sits on it, and the dot on the right is now.
 */
export function HorizonView({ isPlaying, songId }: HorizonViewProps) {
  return (
    <div className="relative mt-6 h-36 md:mt-auto md:h-50">
      <div className="draw-in absolute inset-x-0 right-9 bottom-0 h-20 mask-r-from-75% md:right-24 md:h-30 md:mask-r-from-80%">
        <HorizonLine isPlaying={isPlaying} songId={songId} className="size-full" />
      </div>
      <span
        aria-hidden="true"
        className="from-accent/0 to-accent absolute right-14 bottom-15 hidden h-px w-35 bg-linear-to-r md:block"
      />
      <span
        aria-hidden="true"
        className="pop-in bg-accent motion-safe:animate-pulse-now absolute right-5 bottom-10 size-3 translate-y-1/2 rounded-full md:right-12 md:bottom-15"
      />
      <span
        aria-hidden="true"
        className="text-label text-text-muted absolute right-10 bottom-24 hidden font-mono uppercase md:block"
      >
        {m.horizon_now()}
      </span>
      <p className="text-logo condensed absolute bottom-10 left-6 m-0 md:bottom-15 md:left-10">
        aubesonore
      </p>
    </div>
  );
}

export function Horizon() {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const songId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  return <HorizonView isPlaying={isPlaying} songId={songId} />;
}
