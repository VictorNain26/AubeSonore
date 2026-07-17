import { useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Music, Heart, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNowPlayingStore, isDefaultArtwork } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { useMoment } from '../../hooks/useMoment';
import { shareTrack } from '../../lib/shareTrack';
import { MOMENT_SHARE_PHRASES } from '../../lib/moments';
import { trackFlip, toggle as toggleTransition, pressScale } from '../../lib/motion';

// Album art + like + share, subscribing directly to the stores it needs.
// No props: the component is self-sufficient.

export function TrackArtwork() {
  const { artUrl, title, artist, isLive } = useNowPlayingStore(
    useShallow((s) => ({
      artUrl: s.data?.now_playing?.song.art,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
      isLive: s.data?.live.is_live ?? false,
    }))
  );
  const isPlaying = usePlayer((s) => s.isPlaying);
  const moment = useMoment();
  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();
  const [artError, setArtError] = useState(false);

  const isLiked = title && artist ? isTrackLiked(tracks, title, artist) : false;
  const isLiking = likingTrackId === `${title}-${artist}`;

  const trackUrl = useMemo(() => {
    if (!title || !artist) return undefined;
    const likedTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === title.toLowerCase() &&
        t.artist.toLowerCase() === artist.toLowerCase()
    );
    return getTrackShareUrl(likedTrack ?? { title, artist }, preferences?.preferredPlatform);
  }, [title, artist, tracks, preferences]);

  const handleArtError = useCallback(() => setArtError(true), []);
  const handleToggleLike = useCallback(() => {
    if (title && artist) {
      void toggleLike(title, artist, artUrl);
    }
  }, [title, artist, artUrl, toggleLike]);
  const handleShare = useCallback(() => {
    if (!title || !artist || !trackUrl) return;
    void shareTrack({
      title,
      artist,
      url: trackUrl,
      momentLabel: MOMENT_SHARE_PHRASES[moment],
    })
      .then((result) => {
        if (result === 'copied') toast('Lien copié');
      })
      .catch(() => {
        toast('Partage impossible');
      });
  }, [title, artist, trackUrl, moment]);

  const isDefaultCover = !artUrl || artError || isDefaultArtwork(artUrl);

  return (
    <div key={artUrl} className="relative artwork-size mx-auto lg:mx-0">
      <div
        className={cn(
          'relative aspect-square w-full overflow-hidden rounded-lg bg-paper-raised',
          'transition-transform duration-500 ease-(--ease-fluid)',
          isPlaying && 'scale-[1.01]'
        )}
      >
        {/* initial={false} : le montage est animé par la cascade Entry. */}
        <AnimatePresence mode="wait" initial={false}>
          {!isDefaultCover ? (
            <motion.img
              key={artUrl}
              src={artUrl}
              alt={title}
              className="size-full object-cover"
              referrerPolicy="no-referrer"
              decoding="async"
              fetchPriority="high"
              onError={handleArtError}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={trackFlip}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-paper-raised">
              <Music className="size-12 text-ink-faint" />
            </div>
          )}
        </AnimatePresence>

        {title && (
          <div className="absolute inset-0 flex items-end justify-between p-2">
            <motion.button
              onClick={handleShare}
              whileTap={{ scale: pressScale }}
              transition={toggleTransition}
              className={cn(
                'flex size-10 items-center justify-center rounded-full cursor-pointer',
                'bg-paper/90 border border-line text-ink-faint hover:text-ink transition-colors'
              )}
              title="Partager"
              aria-label="Partager ce morceau"
            >
              <Share2 className="size-4" />
            </motion.button>

            <motion.button
              onClick={handleToggleLike}
              disabled={isLiking}
              whileTap={{ scale: pressScale }}
              transition={toggleTransition}
              className={cn(
                'flex size-10 items-center justify-center rounded-full cursor-pointer',
                'bg-paper/90 border border-line transition-colors',
                isLiked ? 'text-danger' : 'text-ink-faint hover:text-ink',
                isLiking && 'animate-pulse'
              )}
              title={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
              aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
              aria-pressed={isLiked}
            >
              <motion.span
                key={isLiked ? 'liked' : 'unliked'}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={toggleTransition}
              >
                <Heart className={cn('size-4', isLiked && 'fill-current')} />
              </motion.span>
            </motion.button>
          </div>
        )}
      </div>

      {isLive && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-1 text-caption font-medium text-danger">
          <span className="size-1.5 rounded-full bg-danger animate-pulse" />
          LIVE
        </div>
      )}
    </div>
  );
}
