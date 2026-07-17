import { memo, useState } from 'react';
import { Music, Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SongEntry } from '../../lib/azuracast';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface RailCardProps {
  entry: SongEntry;
  isLiked: boolean;
  isLiking: boolean;
  onToggle: () => void;
  onShare: () => void;
}

export const RailCard = memo(function RailCard({
  entry,
  isLiked,
  isLiking,
  onToggle,
  onShare,
}: RailCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div role="listitem" className="group w-33 shrink-0 snap-start">
      <div className="relative size-33 overflow-hidden rounded-md bg-paper-raised">
        {entry.song.art && !imgError ? (
          <img
            src={entry.song.art}
            alt=""
            className="size-full object-cover"
            draggable={false}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="absolute inset-0 m-auto size-6 text-ink-faint" />
        )}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 p-1.5',
            'pointer-events-none opacity-0 transition-opacity duration-200',
            'group-hover:pointer-events-auto group-hover:opacity-100',
            'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
            'pointer-coarse:pointer-events-auto pointer-coarse:opacity-100'
          )}
        >
          <button
            onClick={onShare}
            className={cn(
              'flex size-8 items-center justify-center rounded-full cursor-pointer',
              'bg-paper/90 border border-line text-ink-faint hover:text-ink transition-colors'
            )}
            aria-label="Partager"
          >
            <Share2 className="size-3.5" />
          </button>
          <button
            onClick={onToggle}
            disabled={isLiking}
            aria-pressed={isLiked}
            aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
            className={cn(
              'flex size-8 items-center justify-center rounded-full cursor-pointer',
              'bg-paper/90 border border-line transition-colors',
              isLiked ? 'text-danger' : 'text-ink-faint hover:text-ink',
              isLiking && 'animate-pulse pointer-events-none'
            )}
          >
            <Heart className={cn('size-3.5', isLiked && 'fill-current')} />
          </button>
        </div>
      </div>
      <p className="mt-1.5 truncate text-body text-ink">{entry.song.title}</p>
      <p className="truncate text-caption text-ink-soft">{entry.song.artist}</p>
      <p className="text-caption text-ink-faint">
        {timeFormatter.format(new Date(entry.played_at * 1000))}
      </p>
    </div>
  );
});
