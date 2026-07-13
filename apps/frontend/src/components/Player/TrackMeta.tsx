import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useShallow } from 'zustand/react/shallow';
import { useNowPlayingStore } from '../../lib/azuracast';
import { trackFlip } from './motion-presets';

gsap.registerPlugin(SplitText);

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function TrackMeta() {
  const { shId, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      shId: s.data?.now_playing?.sh_id,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (reduced() || !titleRef.current) return;

      const split = new SplitText(titleRef.current, { type: 'chars' });
      gsap.fromTo(
        split.chars,
        { y: '0.6em', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', stagger: { amount: 0.2 } }
      );

      return () => split.revert();
    },
    { dependencies: [shId], scope: titleRef }
  );

  return (
    <div className="text-center mb-5">
      <AnimatePresence mode="wait">
        {reduced() ? (
          <motion.h2
            key={shId ?? 'waiting'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={trackFlip}
            className="text-lg md:text-xl font-medium text-foreground truncate"
          >
            {title || 'En attente...'}
          </motion.h2>
        ) : (
          <h2
            key={shId ?? 'waiting'}
            ref={titleRef}
            className="text-lg md:text-xl font-medium text-foreground truncate"
          >
            {title || 'En attente...'}
          </h2>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.p
          key={shId ?? 'waiting'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={trackFlip}
          className="text-sm text-foreground/50 truncate px-2 mt-0.5"
        >
          {artist || '—'}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
