import { memo, useState } from 'react';
import { Music, Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SongEntry } from '../../lib/azuracast';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface StationLogRowProps {
  entry: SongEntry;
  isLiked: boolean;
  isLiking: boolean;
  onToggle: () => void;
  onShare: () => void;
}

// One entry in the station log: a small cover, the track, when it aired.
// Like + share stay out of the way until the row is hovered/focused (or
// always, on touch) — except a liked row, which keeps its heart lit so you
// can see at a glance what you've already caught.
export const StationLogRow = memo(function StationLogRow({
  entry,
  isLiked,
  isLiking,
  onToggle,
  onShare,
}: StationLogRowProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div role="listitem" className="group flex items-center gap-3 py-2.5">
      <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-paper-raised">
        {entry.song.art && !imgError ? (
          <img
            src={entry.song.art}
            alt=""
            className="size-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="absolute inset-0 m-auto size-4 text-ink-faint" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-ink-soft">{entry.song.title}</p>
        <p className="truncate text-caption text-ink-soft">{entry.song.artist}</p>
      </div>

      <time className="shrink-0 text-caption text-ink-faint tabular-nums">
        {timeFormatter.format(new Date(entry.played_at * 1000))}
      </time>

      <div
        className={cn(
          'shrink-0 items-center gap-0.5',
          isLiked ? 'flex' : 'hidden group-hover:flex group-focus-within:flex pointer-coarse:flex'
        )}
      >
        <button
          onClick={onShare}
          aria-label="Partager"
          className={cn(
            'flex size-8 items-center justify-center rounded-full cursor-pointer',
            'text-ink-faint hover:text-ink transition-colors'
          )}
        >
          <Share2 className="size-3.5" />
        </button>
        <button
          onClick={onToggle}
          disabled={isLiking}
          aria-pressed={isLiked}
          aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
          className={cn(
            'flex size-8 items-center justify-center rounded-full cursor-pointer transition-colors',
            isLiked ? 'text-danger' : 'text-ink-faint hover:text-ink',
            isLiking && 'animate-pulse pointer-events-none'
          )}
        >
          <Heart className={cn('size-3.5', isLiked && 'fill-current')} />
        </button>
      </div>
    </div>
  );
});
