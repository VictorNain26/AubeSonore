import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../atoms/Button';

/** Presentational props for the now-playing action row. */
export interface TrackActionsViewProps {
  /** Whether the current track is in the user's library. */
  isLiked: boolean;
  /** Whether a like/unlike request is in flight. */
  isLiking: boolean;
  /** Toggles like state for the current track. */
  onToggleLike: () => void;
  /** Shares the current track. */
  onShare: () => void;
}

export function TrackActionsView({
  isLiked,
  isLiking,
  onToggleLike,
  onShare,
}: TrackActionsViewProps) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="icon" aria-label="Partager ce morceau" onClick={onShare}>
        <Share2 className="size-5" />
      </Button>
      <Button
        variant="icon"
        aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
        onClick={onToggleLike}
        aria-pressed={isLiked}
        disabled={isLiking}
        className={cn(isLiked ? 'text-accent' : undefined, isLiking && 'animate-pulse')}
      >
        <Heart className={cn('size-5', isLiked && 'fill-current')} />
      </Button>
    </div>
  );
}
