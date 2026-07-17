import { useEffect, useState } from 'react';
import { getMoment, MOMENT_ORDER, nextBoundary, type Moment } from '../lib/moments';

function forcedMoment(): Moment | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get('moment');
  return MOMENT_ORDER.includes(value as Moment) ? (value as Moment) : null;
}

export function useMoment(): Moment {
  const [moment, setMoment] = useState<Moment>(() => forcedMoment() ?? getMoment(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const forced = forcedMoment();

    const arm = () => {
      const now = new Date();
      setMoment(forced ?? getMoment(now));
      const delay = nextBoundary(now).getTime() - now.getTime() + 500;
      timer = setTimeout(arm, delay);
    };
    arm();

    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        arm();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.moment = moment;
    // La meta theme-color (barre système / chrome PWA) suit le papier du
    // moment — lue depuis le token CSS pour ne jamais dériver de index.css.
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
    if (paper) {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper);
    }
    if (document.documentElement.dataset.momentReady) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        document.documentElement.dataset.momentReady = 'true';
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [moment]);

  return moment;
}
