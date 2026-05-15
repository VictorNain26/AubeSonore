import { useState, useMemo, useCallback } from 'react';
import { Music, Heart } from 'lucide-react';
import { ShareButton } from '../ShareCard/ShareButton';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNowPlaying, isDefaultArtwork } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { trackFlip, toggle as toggleTransition } from './motion-presets';

// Album art + like + share, subscribing directly to the stores it needs.
// No props: the component is self-sufficient.

export function TrackArtwork() {
  const { data: np } = useNowPlaying();
  const isPlaying = usePlayer((s) => s.isPlaying);
  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();
  const [artError, setArtError] = useState(false);

  const nowPlaying = np?.now_playing;
  const artUrl = nowPlaying?.song.art;
  const title = nowPlaying?.song.title;
  const artist = nowPlaying?.song.artist;
  const isLive = np?.live.is_live;

  const isLiked = nowPlaying
    ? isTrackLiked(tracks, nowPlaying.song.title, nowPlaying.song.artist)
    : false;
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
    if (nowPlaying) {
      void toggleLike(nowPlaying.song.title, nowPlaying.song.artist, nowPlaying.song.art);
    }
  }, [nowPlaying, toggleLike]);

  const isDefaultCover = !artUrl || artError || isDefaultArtwork(artUrl);

  return (
    <div key={artUrl} className="relative group">
      <div
        className={cn(
          'w-64 h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-2xl overflow-hidden',
          'shadow-2xl border border-foreground/10',
          'transition-transform duration-500',
          isPlaying && 'scale-[1.02]'
        )}
      >
        <AnimatePresence mode="wait">
          {!isDefaultCover ? (
            <motion.img
              key={artUrl}
              src={artUrl}
              alt={title}
              className="w-full h-full object-cover"
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
            <div className="relative w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-foreground/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-foreground/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-foreground/10" />
              </div>
              <div className="relative">
                <div className="absolute inset-0 blur-xl bg-accent/20 rounded-full scale-150" />
                <Music className="relative w-12 h-12 text-foreground/40" />
              </div>
              <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />
            </div>
          )}
        </AnimatePresence>

        {title && (
          <div className="absolute inset-0 flex items-end justify-between p-2 sm:p-3">
            <ShareButton artUrl={artUrl} title={title} artist={artist || ''} trackUrl={trackUrl} />

            <motion.button
              onClick={handleToggleLike}
              disabled={isLiking}
              whileTap={{ scale: 0.9 }}
              transition={toggleTransition}
              className={cn(
                'p-2.5 sm:p-3 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer',
                'backdrop-blur-md shadow-lg border',
                isLiked
                  ? 'bg-danger text-foreground border-danger'
                  : 'bg-overlay/60 text-foreground hover:bg-overlay/70 border-foreground/20',
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
                <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
              </motion.span>
            </motion.button>
          </div>
        )}
      </div>

      {isLive && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-danger rounded-full text-xs font-medium text-foreground flex items-center gap-1 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
          LIVE
        </div>
      )}
    </div>
  );
}
