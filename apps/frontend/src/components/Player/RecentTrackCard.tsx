import { useState } from 'react';
import { Music, Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SongEntry } from '../../lib/azuracast';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

interface RecentTrackCardProps {
  entry: SongEntry;
  isLiked: boolean;
  isLiking: boolean;
  onToggle: () => void;
  onShare: () => void;
}

export function RecentTrackCard({
  entry,
  isLiked,
  isLiking,
  onToggle,
  onShare,
}: RecentTrackCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <li className="group flex items-center gap-3 border-b border-border px-6 py-3 last:border-b-0">
      <div className="relative size-10 shrink-0 overflow-hidden rounded-sm bg-surface-raised">
        {entry.song.art && !imgError ? (
          <img
            src={entry.song.art}
            alt=""
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="absolute inset-0 m-auto size-4 text-text-faint" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body text-text">{entry.song.title}</p>
        <p className="truncate text-caption text-text-muted">{entry.song.artist}</p>
      </div>

      <p className="shrink-0 text-caption text-text-faint">
        {timeFormatter.format(new Date(entry.played_at * 1000))}
      </p>

      <button
        type="button"
        onClick={onToggle}
        disabled={isLiking}
        className={cn(
          'size-11 shrink-0 flex items-center justify-center rounded-md transition-opacity',
          'enabled:hover:bg-surface-raised enabled:focus-visible:bg-surface-raised',
          'disabled:opacity-50',
          'touch-target:min-h-[44px] touch-target:min-w-[44px]',
          isLiked
            ? 'opacity-100 text-accent'
            : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-text-faint hover:text-text'
        )}
        aria-label={isLiked ? 'Retirer de mes morceaux' : 'Ajouter à mes morceaux'}
      >
        <Heart className="size-5" fill={isLiked ? 'currentColor' : 'none'} />
      </button>

      <button
        type="button"
        onClick={onShare}
        className={cn(
          'size-11 shrink-0 flex items-center justify-center rounded-md transition-opacity',
          'hover:bg-surface-raised focus-visible:bg-surface-raised',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-text-faint hover:text-text',
          'touch-target:min-h-[44px] touch-target:min-w-[44px]'
        )}
        aria-label="Partager"
      >
        <Share2 className="size-5" />
      </button>
    </li>
  );
}
