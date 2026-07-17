import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { Users } from 'lucide-react';
import { useNowPlayingStore } from '../../lib/azuracast';
import { dataTick } from '../../lib/motion';

// Right-side LIVE + listeners count. The count crossfades vertically on
// each value change for a soft swap instead of a hard substitution.

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

export function ListenersBadge() {
  const { current, isLive, streamerName, broadcastStart } = useNowPlayingStore(
    useShallow((s) => ({
      current: s.data?.listeners?.current,
      isLive: s.data?.live?.is_live ?? false,
      streamerName: s.data?.live?.streamer_name ?? '',
      broadcastStart: s.data?.live?.broadcast_start ?? null,
    }))
  );

  const elapsed = useBroadcastElapsed(isLive && streamerName ? broadcastStart : null);

  if (current === undefined) return null;

  return (
    <div
      className="flex items-center gap-1.5 text-caption text-ink-faint"
      aria-live="polite"
      aria-atomic="true"
    >
      {isLive && (
        <span className="flex items-center gap-1 text-danger font-medium">
          <span className="size-1.5 rounded-full bg-danger animate-pulse" />
          LIVE
        </span>
      )}
      {isLive && streamerName && (
        <span className="text-ink-faint">
          {streamerName}
          {elapsed && ` · depuis ${elapsed}`}
        </span>
      )}
      {current === 0 ? (
        <span className="hidden sm:inline italic">l&apos;antenne vous attend</span>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
