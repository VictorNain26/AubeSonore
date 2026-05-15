import { useEffect } from 'react';
import { useStatsStore } from '../../stores/statsStore';

// Ticks `listeningTime` stats every 10s while playing.
// Pauses cleanly when isPlaying flips false (interval is cleared).

export function useListeningTimeTracker(isPlaying: boolean): void {
  const tickListeningTime = useStatsStore((s) => s.tickListeningTime);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      void tickListeningTime();
    }, 10_000);
    return () => clearInterval(id);
  }, [isPlaying, tickListeningTime]);
}
