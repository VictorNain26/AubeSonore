import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { findCurrentLine, type LyricLine } from '../../lib/lrcParser';

interface LyricsPanelProps {
  show: boolean;
  syncedLines: LyricLine[] | null;
  plainLyrics: string | null;
  isLoading: boolean;
  elapsed: number;
}

export function LyricsPanel({
  show,
  syncedLines,
  plainLyrics,
  isLoading,
  elapsed,
}: LyricsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasSynced = syncedLines && syncedLines.length > 0;
  const currentIndex = hasSynced ? findCurrentLine(syncedLines, elapsed) : -1;

  // Auto-scroll to current line
  useEffect(() => {
    if (!hasSynced || currentIndex < 0 || !containerRef.current) return;

    const container = containerRef.current;
    const activeLine = container.querySelector('[data-active="true"]');
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex, hasSynced]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden mb-4"
        >
          <div
            ref={containerRef}
            className={cn(
              'max-h-48 overflow-y-auto rounded-xl px-4 py-3',
              'bg-white/[0.03] border border-white/10 backdrop-blur-sm',
              'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10'
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
              </div>
            ) : hasSynced ? (
              <div className="space-y-1.5">
                {syncedLines.map((line, i) => (
                  <p
                    key={`${line.time}-${i}`}
                    data-active={i === currentIndex}
                    className={cn(
                      'text-sm transition-all duration-300 leading-relaxed',
                      i === currentIndex
                        ? 'text-white font-medium scale-[1.02] origin-left'
                        : i < currentIndex
                          ? 'text-white/30'
                          : 'text-white/50'
                    )}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            ) : plainLyrics ? (
              <p className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">
                {plainLyrics}
              </p>
            ) : (
              <p className="text-sm text-white/30 text-center py-4">Paroles non disponibles</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
