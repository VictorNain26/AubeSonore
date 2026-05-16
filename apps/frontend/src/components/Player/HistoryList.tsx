import { lazy, Suspense, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNowPlayingStore, type SongEntry } from '../../lib/azuracast';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { HistoryItem } from './HistoryItem';

const FullHistoryModal = lazy(() =>
  import('./FullHistoryModal').then((m) => ({ default: m.FullHistoryModal }))
);

// Recent-track history (max 5). Subscribes directly to the store and
// keeps its own like-action wiring so the parent never has to thread
// callbacks down.
//
// The selector returns `song_history` by reference; AzuraCast parses
// fresh JSON each poll so the array changes every tick. Re-renders here
// are cheap (5 memoized items) so we don't bother caching equality —
// individual HistoryItem re-renders when its `entry` reference flips.

const MAX_HISTORY = 5;

export function HistoryList() {
  const historyEntries = useNowPlayingStore((s) => s.data?.song_history);
  const tracks = useLikedTracksStore((s) => s.tracks);
  const { likingTrackId, toggleLike } = useLikeAction();
  const [isFullHistoryOpen, setIsFullHistoryOpen] = useState(false);

  const isHistoryTrackLiked = useCallback(
    (entry: SongEntry) => isTrackLiked(tracks, entry.song.title, entry.song.artist),
    [tracks]
  );

  const entries = historyEntries?.slice(0, MAX_HISTORY);
  if (!entries || entries.length === 0) return null;

  return (
    <div className="border-t border-foreground/10 pt-4">
      <p id="history-label" className="text-xs text-foreground/50 mb-2">
        Historique
      </p>
      <div role="list" aria-labelledby="history-label">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.sh_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
          >
            <HistoryItem
              entry={entry}
              isLiked={isHistoryTrackLiked(entry)}
              isLiking={likingTrackId === `${entry.song.title}-${entry.song.artist}`}
              onToggle={() => {
                void toggleLike(entry.song.title, entry.song.artist, entry.song.art);
              }}
            />
          </motion.div>
        ))}
      </div>
      <button
        onClick={() => setIsFullHistoryOpen(true)}
        className={cn(
          'mt-2 flex items-center gap-1.5 text-xs text-foreground/40',
          'hover:text-foreground/70 transition-colors duration-200 cursor-pointer'
        )}
      >
        <History className="w-3.5 h-3.5" />
        Voir l&apos;historique complet
      </button>
      {isFullHistoryOpen && (
        <Suspense fallback={null}>
          <FullHistoryModal
            isOpen={isFullHistoryOpen}
            onClose={() => setIsFullHistoryOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
