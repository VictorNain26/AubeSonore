import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNowPlayingStore, type SongEntry } from '../../lib/azuracast';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { HistoryItem } from './HistoryItem';

const MAX_HISTORY = 5;

export function HistoryList() {
  const historyEntries = useNowPlayingStore((s) => s.data?.song_history);
  const tracks = useLikedTracksStore((s) => s.tracks);
  const { likingTrackId, toggleLike } = useLikeAction();
  const [expanded, setExpanded] = useState(false);

  const isHistoryTrackLiked = useCallback(
    (entry: SongEntry) => isTrackLiked(tracks, entry.song.title, entry.song.artist),
    [tracks]
  );

  const entries = historyEntries?.slice(0, MAX_HISTORY);
  if (!entries || entries.length === 0) return null;

  const first = entries[0];
  const rest = entries.slice(1);

  const renderItem = (entry: SongEntry, index: number) => (
    <HistoryItem
      key={entry.sh_id}
      entry={entry}
      isLiked={isHistoryTrackLiked(entry)}
      isLiking={likingTrackId === `${entry.song.title}-${entry.song.artist}`}
      onToggle={() => void toggleLike(entry.song.title, entry.song.artist, entry.song.art)}
    />
  );

  return (
    <div className="border-t border-foreground/10 pt-4">
      <p id="history-label" className="text-xs text-foreground/50 mb-2">
        Historique
      </p>
      <div role="list" aria-labelledby="history-label">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {renderItem(first, 0)}
        </motion.div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="rest"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              {rest.map((entry, i) => (
                <motion.div
                  key={entry.sh_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  {renderItem(entry, i + 1)}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {rest.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'mt-1 flex items-center gap-1 text-xs text-foreground/40',
            'hover:text-foreground/70 transition-colors duration-200 cursor-pointer'
          )}
        >
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.22 }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.span>
          {expanded ? 'Voir moins' : `Voir ${rest.length} de plus`}
        </button>
      )}
    </div>
  );
}
