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
    <div role="listitem" className="group w-[132px] shrink-0 snap-start">
      <div className="relative h-[132px] w-[132px] overflow-hidden rounded-md bg-paper-raised">
        {entry.song.art && !imgError ? (
          <img
            src={entry.song.art}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="absolute inset-0 m-auto h-6 w-6 text-ink-faint" />
        )}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 p-1.5',
            'pointer-events-none opacity-0 transition-opacity duration-200',
            'group-hover:pointer-events-auto group-hover:opacity-100',
            'group-focus-within:pointer-events-auto group-focus-within:opacity-100'
          )}
        >
          <button
            onClick={onShare}
            className="rounded-md bg-paper p-1.5 text-ink-soft hover:text-ink cursor-pointer"
            aria-label="Partager"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            disabled={isLiking}
            aria-pressed={isLiked}
            aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
            className={cn(
              'rounded-md bg-paper p-1.5 cursor-pointer',
              isLiked ? 'text-danger' : 'text-ink-soft hover:text-danger',
              isLiking && 'animate-pulse pointer-events-none'
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', isLiked && 'fill-current')} />
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
