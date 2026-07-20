import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNowPlayingStore } from '../../lib/azuracast';

// One quiet status line for the broadcast: always "on air", with the DJ
// name and elapsed time surfacing when a live host is on. Listener count
// is deliberately never shown here.

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 1) return `${h}h ${m}min`;
  return `${m}min`;
}

function useBroadcastElapsed(broadcastStart: number | null): string | null {
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    if (broadcastStart === null) return;

    const compute = () => {
      const diffSeconds = Math.floor(Date.now() / 1000) - broadcastStart;
      setElapsed(diffSeconds > 0 ? formatElapsed(diffSeconds) : null);
    };

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [broadcastStart]);

  return broadcastStart === null ? null : elapsed;
}

export function AntennaStatus() {
  const { isLive, streamerName, broadcastStart } = useNowPlayingStore(
    useShallow((s) => ({
      isLive: s.data?.live?.is_live ?? false,
      streamerName: s.data?.live?.streamer_name ?? '',
      broadcastStart: s.data?.live?.broadcast_start ?? null,
    }))
  );

  const elapsed = useBroadcastElapsed(isLive && streamerName ? broadcastStart : null);

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-faint"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="flex items-center gap-1.5 font-medium text-danger">
        <span className="size-1.5 rounded-full bg-danger animate-pulse" />
        En direct
      </span>
      {isLive && streamerName && <span className="text-ink-soft">· {streamerName}</span>}
      {isLive && elapsed && <span>· depuis {elapsed}</span>}
    </div>
  );
}
