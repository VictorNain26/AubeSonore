import { useState, useMemo, useCallback } from 'react';
import { Music, Heart } from 'lucide-react';
import { ShareButton } from '../ShareCard/ShareButton';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLikedTracksContext } from '../../contexts/LikedTracksContext';
import { usePreferences } from '../../hooks/usePreferences';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { isDefaultArtwork } from '@aubesonore/core/azuracast';

// ─────────────────────────────────────────────
// Album Art Component with elegant fallback
// ─────────────────────────────────────────────

interface AlbumArtProps {
  artUrl: string | undefined;
  title: string | undefined;
  artist: string | undefined;
  isPlaying: boolean;
  isLiked: boolean;
  isLiking: boolean;
  isLive?: boolean | undefined;
  onToggleLike: () => void;
}

export function AlbumArt({
  artUrl,
  title,
  artist,
  isPlaying,
  isLiked,
  isLiking,
  isLive,
  onToggleLike,
}: AlbumArtProps) {
  const [artError, setArtError] = useState(false);
  const { tracks } = useLikedTracksContext();
  const { preferences } = usePreferences();

  // Find the best listening URL for sharing
  const trackUrl = useMemo(() => {
    if (!title || !artist) return undefined;
    const likedTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === title.toLowerCase() &&
        t.artist.toLowerCase() === artist.toLowerCase()
    );
    return getTrackShareUrl(likedTrack ?? { title, artist }, preferences?.preferredPlatform);
  }, [title, artist, tracks, preferences]);

  const handleArtError = useCallback(() => {
    setArtError(true);
  }, []);

  // Détecter la cover par défaut AzuraCast (source unique : packages/core)
  const isDefaultCover = !artUrl || artError || isDefaultArtwork(artUrl);

  return (
    <div key={artUrl} className="relative group">
      <div
        className={cn(
          'w-64 h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-2xl overflow-hidden',
          'shadow-2xl border border-white/10',
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            // Fallback élégant - Design sobre avec dégradé subtil
            <div className="relative w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden">
              {/* Cercles décoratifs subtils */}
              <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-white/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/10" />
              </div>
              {/* Icône centrale avec glow subtil */}
              <div className="relative">
                <div className="absolute inset-0 blur-xl bg-purple-500/20 rounded-full scale-150" />
                <Music className="relative w-12 h-12 text-white/40" />
              </div>
              {/* Grain subtil */}
              <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />
            </div>
          )}
        </AnimatePresence>

        {/* Action buttons overlay */}
        {title && (
          <div className="absolute inset-0 flex items-end justify-between p-2 sm:p-3">
            {/* Share button - bottom left */}
            <ShareButton artUrl={artUrl} title={title} artist={artist || ''} trackUrl={trackUrl} />

            {/* Like button - bottom right */}
            <button
              onClick={onToggleLike}
              disabled={isLiking}
              className={cn(
                'p-2.5 sm:p-3 rounded-full transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer',
                'backdrop-blur-md shadow-lg active:scale-95 border',
                isLiked
                  ? 'bg-red-500 text-white border-red-400'
                  : 'bg-black/60 text-white hover:bg-black/70 border-white/20',
                isLiking && 'animate-pulse'
              )}
              title={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
              aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
              aria-pressed={isLiked}
            >
              <Heart className={cn('w-5 h-5 transition-all', isLiked && 'fill-current')} />
            </button>
          </div>
        )}
      </div>

      {/* Live indicator */}
      {isLive && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 rounded-full text-xs font-medium text-white flex items-center gap-1 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      )}
    </div>
  );
}
