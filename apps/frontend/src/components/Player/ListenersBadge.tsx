import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { Users } from 'lucide-react';
import { useNowPlayingStore } from '../../lib/azuracast';
import { dataTick } from './motion-presets';

// Right-side LIVE + listeners count. The count crossfades vertically on
// each value change for a soft swap instead of a hard substitution.

export function ListenersBadge() {
  const { current, isLive } = useNowPlayingStore(
    useShallow((s) => ({
      current: s.data?.listeners?.current,
      isLive: s.data?.live?.is_live ?? false,
    }))
  );
  if (current === undefined) return null;

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-foreground/50"
      aria-live="polite"
      aria-atomic="true"
    >
      {isLive && (
        <span className="flex items-center gap-1 text-danger font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
          LIVE
        </span>
      )}
      <Users className="w-3.5 h-3.5" aria-hidden="true" />
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
    </div>
  );
}
