import { useState } from 'react';
import { Music, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type SongEntry } from '../../lib/azuracast';
import { formatTimeAgo } from './utils';

// ─────────────────────────────────────────────
// History Item Component
// ─────────────────────────────────────────────

interface HistoryItemProps {
  entry: SongEntry;
  isLiked: boolean;
  isLiking: boolean;
  onToggle: () => void;
}

export function HistoryItem({ entry, isLiked, isLiking, onToggle }: HistoryItemProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-3 py-2 group">
      <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
        {entry.song.art && !imgError ? (
          <img
            src={entry.song.art}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="w-5 h-5 text-white/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{entry.song.title}</p>
        <p className="text-xs text-white/50 truncate">{entry.song.artist}</p>
      </div>
      {/* Heart toggle - 44px touch target, single tap to add/remove */}
      <button
        onClick={onToggle}
        disabled={isLiking}
        className={cn(
          'p-2.5 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center',
          'active:scale-90 cursor-pointer',
          isLiked
            ? 'text-red-500 hover:text-red-400'
            : 'text-white/30 hover:text-red-400',
          isLiking && 'animate-pulse pointer-events-none'
        )}
        title={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
        aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
        aria-pressed={isLiked}
      >
        <Heart className={cn('w-5 h-5 transition-all', isLiked && 'fill-current scale-110')} />
      </button>
      <span className="text-xs text-white/40 shrink-0">
        {formatTimeAgo(entry.played_at)}
      </span>
    </div>
  );
}
