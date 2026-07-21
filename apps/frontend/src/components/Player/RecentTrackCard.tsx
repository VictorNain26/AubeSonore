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

const actionClassName =
  'size-11 shrink-0 flex items-center justify-center rounded-md transition-opacity hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-80';

const revealClassName =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100';

export function RecentTrackCard({
  entry,
  isLiked,
  isLiking,
  onToggle,
  onShare,
}: RecentTrackCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div role="listitem" className="group flex shrink-0 snap-start items-center gap-3 py-1">
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

      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="max-w-40 truncate text-body text-text-muted">{entry.song.title}</p>
        <p className="max-w-40 truncate text-caption text-text-faint">{entry.song.artist}</p>
      </div>

      <time className="shrink-0 text-caption text-text-faint tabular-nums">
        {timeFormatter.format(new Date(entry.played_at * 1000))}
      </time>

      <button
        type="button"
        onClick={onToggle}
        disabled={isLiking}
        className={cn(
          actionClassName,
          'disabled:pointer-events-none disabled:opacity-50',
          isLiked ? 'text-accent' : cn(revealClassName, 'text-text-faint hover:text-text')
        )}
        aria-label={isLiked ? 'Retirer de mes morceaux' : 'Ajouter à mes morceaux'}
      >
        <Heart className="size-5" fill={isLiked ? 'currentColor' : 'none'} />
      </button>

      <button
        type="button"
        onClick={onShare}
        className={cn(actionClassName, revealClassName, 'text-text-faint hover:text-text')}
        aria-label="Partager"
      >
        <Share2 className="size-5" />
      </button>
    </div>
  );
}
