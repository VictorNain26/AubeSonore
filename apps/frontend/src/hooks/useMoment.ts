import { useEffect, useState } from 'react';
import { getMoment, nextBoundary, type Moment } from '../lib/moments';

export function useMoment(): Moment {
  const [moment, setMoment] = useState<Moment>(() => getMoment(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const arm = () => {
      const now = new Date();
      setMoment(getMoment(now));
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
