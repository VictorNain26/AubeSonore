import { Heart, Share2 } from 'lucide-react';
import { Thumbnail } from '../atoms/Thumbnail';
import { IconButton } from '../atoms/IconButton';

export interface TrackRailItemProps {
  title: string;
  artist: string;
  art?: string;
  time: string;
  isLiked: boolean;
  isLiking: boolean;
  onToggle: () => void;
  onShare: () => void;
}

export function TrackRailItem({
  title,
  artist,
  art,
  time,
  isLiked,
  isLiking,
  onToggle,
  onShare,
}: TrackRailItemProps) {
  return (
    <div role="listitem" className="group flex w-64 shrink-0 items-center gap-3 py-3">
      <Thumbnail {...(art !== undefined ? { src: art } : {})} size="md" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body text-text-muted">{title}</p>
        <p className="truncate text-caption text-text-faint">{artist}</p>
      </div>

      <time className="shrink-0 text-caption text-text-faint tabular-nums">{time}</time>

      <IconButton
        label={isLiked ? 'Retirer de mes morceaux' : 'Ajouter à mes morceaux'}
        active={isLiked}
        reveal
        disabled={isLiking}
        onClick={onToggle}
      >
        <Heart className="size-5" fill={isLiked ? 'currentColor' : 'none'} />
      </IconButton>

      <IconButton label="Partager" reveal onClick={onShare}>
        <Share2 className="size-5" />
      </IconButton>
    </div>
  );
}
