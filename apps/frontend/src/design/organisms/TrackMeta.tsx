import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useInkFlip } from '../../lib/motion';
import { Button } from '../atoms/Button';

/** Presentational props for the now-playing masthead. */
export interface TrackMetaViewProps {
  /** Motion props (initial/animate/exit/transition) applied to each crossfading block. */
  inkFlip: ReturnType<typeof useInkFlip>;
  /** Track title, or `undefined` while waiting for the first now-playing payload. */
  title: string | undefined;
  /** Track artist, or `undefined` while waiting for the first now-playing payload. */
  artist: string | undefined;
  /** AzuraCast `sh_id` used as the crossfade key for the title block. */
  shId: number | undefined;
  /** Opens artist info when the artist name is clicked; omit to render plain text. */
  onArtistInfo?: (() => void) | undefined;
  /** Whether the current track is in the user's library. */
  isLiked: boolean;
  /** Whether a like/unlike request is in flight. */
  isLiking: boolean;
  /** Toggles like state for the current track. */
  onToggleLike: () => void;
  /** Shares the current track. */
  onShare: () => void;
}

export function TrackMetaView({
  inkFlip,
  title,
  artist,
  shId,
  onArtistInfo,
  isLiked,
  isLiking,
  onToggleLike,
  onShare,
}: TrackMetaViewProps) {
  return (
    <div className="min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        <m.h2
          key={shId ?? 'waiting'}
          {...inkFlip}
          title={title || undefined}
          className="font-display text-title lg:text-display font-medium text-text [text-wrap:balance] line-clamp-2"
        >
          {title || 'Chargement du direct'}
        </m.h2>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <m.p
          key={artist ?? 'waiting'}
          {...inkFlip}
          className="mt-1 lg:mt-2 text-lead text-text-muted"
        >
          {onArtistInfo && artist ? (
            <button
              onClick={onArtistInfo}
              className="cursor-pointer underline decoration-border underline-offset-4 hover:decoration-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-sm transition-colors"
            >
              {artist}
            </button>
          ) : (
            (artist ?? '—')
          )}
        </m.p>
      </AnimatePresence>
      {title && (
        <div className="mt-2 flex items-center gap-1">
          <Button variant="icon" aria-label="Partager ce morceau" onClick={onShare}>
            <Share2 className="size-4" />
          </Button>
          <Button
            variant="icon"
            aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
            onClick={onToggleLike}
            aria-pressed={isLiked}
            disabled={isLiking}
            className={cn(isLiked ? 'text-accent' : undefined, isLiking && 'animate-pulse')}
          >
            <Heart className={cn('size-4', isLiked && 'fill-current')} />
          </Button>
        </div>
      )}
    </div>
  );
}
