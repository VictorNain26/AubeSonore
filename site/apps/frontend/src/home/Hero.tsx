import { SiteHeader } from './SiteHeader';
import { NowPlaying } from './NowPlaying';
import { Horizon } from './Horizon';
import * as m from '@/paraglide/messages.js';

/**
 * The opening screen: one band of dawn light along the horizon, the promise of
 * the radio, the track on air, and the horizon line that carries the live sound.
 */
export function Hero() {
  return (
    <div className="hero-height relative flex flex-col overflow-hidden">
      <div aria-hidden="true" className="dawn-band motion-safe:animate-breathe" />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full opacity-13 mix-blend-multiply"
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      <SiteHeader />

      <div className="relative z-10 grid gap-10 px-6 pt-12 md:grid-cols-[minmax(0,1fr)_18rem] md:gap-16 md:px-10 md:pt-20">
        <div className="motion-safe:animate-rise flex flex-col gap-4 md:gap-5.5">
          <h1 className="text-hero max-w-hero m-0">{m.hero_title()}</h1>
          <p className="text-intro text-text-muted m-0">{m.hero_tagline()}</p>
        </div>
        <div className="motion-safe:animate-rise-late">
          <NowPlaying />
        </div>
      </div>

      <Horizon />
    </div>
  );
}
