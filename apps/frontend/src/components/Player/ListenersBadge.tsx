import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { useNowPlaying } from '../../lib/azuracast';
import { dataTick } from './motion-presets';

// Right-side LIVE + listeners count. The count crossfades vertically on
// each value change for a soft swap instead of a hard substitution.

export function ListenersBadge() {
  const { data: np } = useNowPlaying();
  if (!np?.listeners) return null;

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-foreground/50"
      aria-live="polite"
      aria-atomic="true"
    >
      {np.live.is_live && (
        <span className="flex items-center gap-1 text-danger font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
          LIVE
        </span>
      )}
      <Users className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="sr-only">Auditeurs : </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={np.listeners.current}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={dataTick}
          className="tabular-nums"
        >
          {np.listeners.current}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
