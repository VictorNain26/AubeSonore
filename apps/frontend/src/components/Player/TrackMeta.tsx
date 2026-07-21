import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useInkFlip } from '../../lib/motion';
import { useTrackActions } from '../../hooks/player/useTrackActions';
import { Button } from '../../design/ui/Button';

// The masthead: track title as a large serif headline, artist as its
// dek. On a track flip the block does a soft crossfade with a slight
// blur — "mise au net" — no translation, no delay.

interface TrackMetaProps {
  onArtistInfo?: (() => void) | undefined;
}

export function TrackMeta({ onArtistInfo }: TrackMetaProps) {
  const inkFlip = useInkFlip();
  const { shId, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      shId: s.data?.now_playing?.sh_id,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );
  const { isLiked, isLiking, handleToggleLike, handleShare } = useTrackActions();

  return (
    <div className="min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        <motion.h2
          key={shId ?? 'waiting'}
          {...inkFlip}
          className="text-title lg:text-display font-medium text-text [text-wrap:balance]"
        >
          {title || 'Chargement du direct'}
        </motion.h2>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
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
        </motion.p>
      </AnimatePresence>
      {title && (
        <div className="mt-2 flex items-center gap-1">
          <Button variant={'icon' as const} aria-label="Partager ce morceau" onClick={handleShare}>
            <Share2 className="size-4" />
          </Button>
          <Button
            variant={'icon' as const}
            aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
            onClick={handleToggleLike}
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
