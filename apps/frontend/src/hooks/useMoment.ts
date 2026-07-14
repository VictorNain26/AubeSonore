import { useEffect, useState } from 'react';
import { getMoment, MOMENT_ORDER, nextBoundary, type Moment } from '../lib/moments';

// Papier de chaque moment (index.css), converti en hex pour la meta
// theme-color — colore la barre système / chrome PWA comme le papier.
const MOMENT_THEME_COLORS: Record<Moment, string> = {
  dawn: '#f9efe7',
  day: '#f5f7fa',
  dusk: '#f4ede1',
  night: '#15151e',
};

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
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', MOMENT_THEME_COLORS[moment]);
  }, [moment]);

  useEffect(() => {
    document.documentElement.dataset.moment = moment;
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
