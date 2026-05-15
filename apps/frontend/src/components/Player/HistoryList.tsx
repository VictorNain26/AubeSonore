import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNowPlaying, type SongEntry } from '../../lib/azuracast';
import { useLikedTracksContext as useLikedTracks } from '../../contexts/LikedTracksContext';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { HistoryItem } from './HistoryItem';

// Recent-track history (max 5). Subscribes directly to useNowPlaying and
// keeps its own like-action wiring so the parent never has to thread
// callbacks down.

const MAX_HISTORY = 5;

export function HistoryList() {
  const { data: np } = useNowPlaying();
  const { isTrackLiked } = useLikedTracks();
  const { likingTrackId, toggleLike } = useLikeAction();

  const isHistoryTrackLiked = useCallback(
    (entry: SongEntry) => isTrackLiked(entry.song.title, entry.song.artist),
    [isTrackLiked]
  );

  const historyEntries = np?.song_history?.slice(0, MAX_HISTORY);
  if (!historyEntries || historyEntries.length === 0) return null;

  return (
    <div className="border-t border-foreground/10 pt-4">
      <p id="history-label" className="text-xs text-foreground/50 mb-2">
        Historique
      </p>
      <div role="list" aria-labelledby="history-label">
        {historyEntries.map((entry, index) => (
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
    </div>
  );
}
