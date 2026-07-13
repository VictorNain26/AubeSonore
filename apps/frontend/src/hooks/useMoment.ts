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
  }, [moment]);

  return moment;
}
