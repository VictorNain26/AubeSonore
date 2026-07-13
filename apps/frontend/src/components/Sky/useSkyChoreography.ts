import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useMoment } from '../../hooks/useMoment';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useSkyChoreography(ref: React.RefObject<HTMLElement | null>): void {
  const moment = useMoment();
  const hasIntroPlayed = useRef(false);

  useGSAP(
    () => {
      const halo = ref.current?.querySelector('.sky-halo');
      const gradient = ref.current?.querySelector('.sky-gradient');
      if (!halo || !gradient) return;

      if (!hasIntroPlayed.current) {
        hasIntroPlayed.current = true;
        if (reduced()) {
          gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
          return;
        }
        gsap
          .timeline({ defaults: { ease: 'power2.out' } })
          .fromTo(gradient, { opacity: 0 }, { opacity: 1, duration: 1.6 }, 0)
          .fromTo(
            halo,
            { yPercent: 18, opacity: 0 },
            { yPercent: 0, opacity: 0.5, duration: 2.4 },
            0.3
          );
        return;
      }
      if (reduced()) return;
      gsap
        .timeline()
        .to(halo, { opacity: 0.75, duration: 1, ease: 'sine.inOut' })
        .to(halo, { opacity: 0.5, duration: 1, ease: 'sine.inOut' });
    },
    { dependencies: [moment], scope: ref }
  );
}
