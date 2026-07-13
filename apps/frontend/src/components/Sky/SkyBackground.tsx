import { useEffect, useRef } from 'react';
import { useSkyChoreography } from './useSkyChoreography';
import './sky.css';

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

function haloPosition(date: Date): { x: number; y: number } {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 22 || h < 5) return { x: 22, y: 24 };
  const t = (h - 5) / 17;
  return { x: 8 + t * 84, y: 72 - Math.sin(t * Math.PI) * 52 };
}

export function SkyBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const apply = () => {
      const { x, y } = haloPosition(new Date());
      root.style.setProperty('--halo-x', `${x}%`);
      root.style.setProperty('--halo-y', `${y}%`);
    };
    apply();
    const id = setInterval(apply, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  useSkyChoreography(ref);

  return (
    <div id="sky-root" ref={ref} className="sky" aria-hidden="true">
      <div className="sky-gradient" />
      <div className="sky-halo" />
      <div className="sky-grain" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
