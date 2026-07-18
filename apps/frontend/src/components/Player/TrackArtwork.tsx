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
import { toggle as toggleTransition, useInkFlip } from '../../lib/motion';

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
  const inkFlip = useInkFlip();

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
              {...inkFlip}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-paper-raised">
              <Music className="size-12 text-ink-faint" />
            </div>
          )}
        </AnimatePresence>

        {title && (
          <div className="absolute inset-0 flex items-end justify-between p-2">
            <button
              onClick={handleShare}
              className={cn(
                'flex size-10 items-center justify-center rounded-full cursor-pointer',
                'bg-paper/90 border border-line text-ink-faint hover:text-ink transition-colors press-ink'
              )}
              title="Partager"
              aria-label="Partager ce morceau"
            >
              <Share2 className="size-4" />
            </button>

            <button
              onClick={handleToggleLike}
              disabled={isLiking}
              className={cn(
                'flex size-10 items-center justify-center rounded-full cursor-pointer',
                'bg-paper/90 border border-line transition-colors press-ink',
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
            </button>
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
