import { useEffect, useState } from 'react';
import { formatTime } from '@aubesonore/core/format';

// One-second readout, isolated from its parent. The visible unit is the
// second, so a rAF loop here would render 60x more than necessary and the
// digits would jitter under sub-millisecond updates. setInterval(1000) is
// the right tool. Re-renders only this <span>, never the parent Player.

interface ElapsedReadoutProps {
  playedAt: number | undefined;
  duration: number;
  isPlaying: boolean;
  className?: string;
}

export function ElapsedReadout({ playedAt, duration, isPlaying, className }: ElapsedReadoutProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isPlaying || playedAt === undefined) return;

    // Initial resync via rAF (async so the React Compiler / hooks v7
    // setState-in-effect rule is satisfied — Date.now() is impure and
    // must not be called during render).
    const rafId = requestAnimationFrame(() => setNow(Date.now()));
    const intervalId = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
    };
  }, [isPlaying, playedAt]);

  const elapsed =
    playedAt === undefined || duration <= 0
      ? 0
      : Math.max(0, Math.min(duration, now / 1000 - playedAt));

  return <span className={className}>{formatTime(elapsed)}</span>;
}
