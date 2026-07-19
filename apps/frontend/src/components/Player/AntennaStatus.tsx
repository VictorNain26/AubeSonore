import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { Users } from 'lucide-react';
import { useNowPlayingStore } from '../../lib/azuracast';
import { dataTick } from '../../lib/motion';

// One quiet status line for the broadcast: who is on air (a live DJ, when
// there is one) and how many are listening. This is the scene's single LIVE
// signal — the artwork no longer carries its own badge. The listener count
// is hidden at zero, because "0 listeners" is social proof in reverse.

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
  const { current, isLive, streamerName, broadcastStart } = useNowPlayingStore(
    useShallow((s) => ({
      current: s.data?.listeners?.current,
      isLive: s.data?.live?.is_live ?? false,
      streamerName: s.data?.live?.streamer_name ?? '',
      broadcastStart: s.data?.live?.broadcast_start ?? null,
    }))
  );

  const elapsed = useBroadcastElapsed(isLive && streamerName ? broadcastStart : null);
  const showCount = typeof current === 'number' && current > 0;

  if (!isLive && !showCount) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-faint"
      aria-live="polite"
      aria-atomic="true"
    >
      {isLive && (
        <span className="flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 font-medium text-danger">
            <span className="size-1.5 rounded-full bg-danger animate-pulse" />
            En direct
          </span>
          {streamerName && <span className="text-ink-soft">· {streamerName}</span>}
          {elapsed && <span>· depuis {elapsed}</span>}
        </span>
      )}
      {isLive && showCount && <span aria-hidden="true">·</span>}
      {showCount && (
        <span className="flex items-center gap-1">
          <Users className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Auditeurs : </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={current}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={dataTick}
              className="tabular-nums"
            >
              {current}
            </motion.span>
          </AnimatePresence>
          <span>à l&apos;écoute</span>
        </span>
      )}
    </div>
  );
}
