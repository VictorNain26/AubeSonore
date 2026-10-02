import { usePlayer } from '../lib/player';
import { HorizonLine } from './HorizonLine';
import * as m from '@/paraglide/messages.js';

export interface HorizonViewProps {
  isPlaying: boolean;
}

/**
 * The horizon at the foot of the dawn: the line is the sound of the live
 * stream, what the radio is sits on it, and the dot on the right is now.
 */
export function HorizonView({ isPlaying }: HorizonViewProps) {
  return (
    <div data-horizon className="relative mt-8 h-40 md:mt-auto md:h-48">
      <div className="draw-in absolute inset-x-0 right-9 bottom-0 h-20 mask-r-from-75% md:right-24 md:h-30 md:mask-r-from-80%">
        <HorizonLine isPlaying={isPlaying} className="size-full" />
      </div>
      <span
        aria-hidden="true"
        className="from-accent/0 to-accent absolute right-14 bottom-15 hidden h-px w-35 bg-linear-to-r md:block"
      />
      <span
        aria-hidden="true"
        className="now-arrive bass-beat bg-accent absolute right-5 bottom-10 size-3 translate-y-1/2 rounded-full md:right-12 md:bottom-15"
      />
      <p className="text-intro text-text-muted max-w-blurb absolute bottom-17 left-6 m-0 text-balance md:bottom-22 md:left-10">
        {m.hero_tagline()}
      </p>
    </div>
  );
}

export function Horizon() {
  const isPlaying = usePlayer((s) => s.isPlaying);
  return <HorizonView isPlaying={isPlaying} />;
}
