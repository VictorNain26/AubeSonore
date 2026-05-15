import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Play, Square, Users, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalErrorFallback } from '../ErrorFallback';
import { cn } from '@/lib/utils';
import { usePlayer } from '../../lib/player';
import { useNowPlaying, type SongEntry } from '../../lib/azuracast';
import { useLikedTracksContext as useLikedTracks } from '../../contexts/LikedTracksContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const LikedTracksModal = lazy(() =>
  import('../LikedTracksModal').then((m) => ({ default: m.LikedTracksModal }))
);
const AuthModal = lazy(() => import('../AuthModal').then((m) => ({ default: m.AuthModal })));

// Sub-components
import { formatTime } from '@aubesonore/core/format';
import { WaveformCanvas } from './WaveformCanvas';
import { ElapsedReadout } from './ElapsedReadout';
import { VolumeControl } from './VolumeControl';
import { HistoryItem } from './HistoryItem';
import { AlbumArt } from './AlbumArt';
import { CastButton } from './CastButton';
import { SleepTimer } from './SleepTimer';
import { ArtistContext } from './ArtistContext';
import { trackFlip, dataTick, toggle as toggleTransition } from './motion-presets';

// Player-domain hooks
import { useLikeAction } from '../../hooks/player/useLikeAction';

export default function Player() {
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isPlaying, volume, play, stop, setVolume } = usePlayer();
  const playError = usePlayer((s) => s.playError);
  const clearPlayError = usePlayer((s) => s.clearPlayError);
  const { data: np } = useNowPlaying();
  const { isTrackLiked, tracks } = useLikedTracks();
  const { isAuthenticated } = useAuth();

  const nowPlaying = np?.now_playing;
  const duration = nowPlaying?.duration || 0;

  const { likingTrackId, isAuthModalOpen, setIsAuthModalOpen, toggleLike } = useLikeAction();

  useEffect(() => {
    if (playError) {
      toast.error(`Lecture impossible : ${playError.message}`);
      clearPlayError();
    }
  }, [playError, clearPlayError]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      void play();
    }
  }, [isPlaying, play, stop]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, prevVolume, volume, setVolume]);

  const handleVolumeChange = useCallback(
    (val: number) => {
      setVolume(val);
      setIsMuted(val === 0);
      if (val > 0) setPrevVolume(val);
    },
    [setVolume]
  );

  const isCurrentTrackLiked = nowPlaying
    ? isTrackLiked(nowPlaying.song.title, nowPlaying.song.artist)
    : false;

  const handleOpenLibrary = useCallback(() => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsModalOpen(true);
  }, [isAuthenticated, setIsAuthModalOpen]);

  const isHistoryTrackLiked = useCallback(
    (entry: SongEntry) => isTrackLiked(entry.song.title, entry.song.artist),
    [isTrackLiked]
  );

  // Skeleton loading state
  if (!np) {
    return (
      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4">
        <div className="flex flex-col items-center mb-5">
          <div className="w-64 h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-2xl skeleton" />
        </div>
        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="h-6 w-48 rounded skeleton" />
          <div className="h-4 w-32 rounded skeleton" />
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-3 w-10 rounded skeleton" />
          <div className="flex-1 h-8 rounded skeleton" />
          <div className="h-3 w-10 rounded skeleton" />
        </div>
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4">
      {/* Section 1: Album Art + Like/Share */}
      <div className="flex flex-col items-center mb-5">
        <AlbumArt
          artUrl={nowPlaying?.song.art}
          title={nowPlaying?.song.title}
          artist={nowPlaying?.song.artist}
          isPlaying={isPlaying}
          isLiked={isCurrentTrackLiked}
          isLiking={likingTrackId === `${nowPlaying?.song.title}-${nowPlaying?.song.artist}`}
          isLive={np?.live.is_live}
          onToggleLike={() => {
            if (nowPlaying) {
              void toggleLike(nowPlaying.song.title, nowPlaying.song.artist, nowPlaying.song.art);
            }
          }}
        />
      </div>

      {/* Section 2: Track Info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={nowPlaying?.sh_id || 'waiting'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={trackFlip}
          className="text-center mb-5"
        >
          <h2 className="text-lg md:text-xl font-medium text-foreground truncate">
            {nowPlaying?.song.title || 'En attente...'}
          </h2>
          <p className="text-sm text-foreground/50 truncate px-2 mt-0.5">
            {nowPlaying?.song.artist || '—'}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Section 3: Waveform Progress */}
      <div className="flex items-center gap-3 mb-5">
        <ElapsedReadout
          playedAt={nowPlaying?.played_at}
          duration={duration}
          isPlaying={isPlaying}
          className="text-xs text-foreground/50 tabular-nums w-10 text-right"
        />
        <div className="flex-1">
          <WaveformCanvas
            playedAt={nowPlaying?.played_at}
            duration={duration}
            isPlaying={isPlaying}
            songId={nowPlaying?.sh_id}
          />
        </div>
        <span className="text-xs text-foreground/50 tabular-nums w-10">{formatTime(duration)}</span>
      </div>

      {/* Section 4: Playback Controls */}
      <div className="flex items-center mb-6 px-2">
        {/* Left */}
        <div className="flex-1 flex justify-start items-center gap-1">
          <CastButton />
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
          />
          <SleepTimer />
        </div>

        {/* Center: Play / Stop */}
        <motion.button
          onClick={togglePlay}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          transition={toggleTransition}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center shrink-0 cursor-pointer',
            'border backdrop-blur-sm',
            isPlaying
              ? 'border-accent/40 bg-accent/15 hover:bg-accent/25 animate-pulse-ring'
              : 'border-foreground/20 bg-foreground/10 hover:bg-foreground/15'
          )}
          aria-label={isPlaying ? 'Arrêter la lecture' : 'Lancer la lecture'}
          aria-pressed={isPlaying}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isPlaying ? (
              <motion.span
                key="stop"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={toggleTransition}
              >
                <Square className="w-5 h-5 text-foreground" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={toggleTransition}
              >
                <Play className="w-7 h-7 text-foreground ml-0.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Right */}
        <div className="flex-1 flex justify-end items-center gap-2">
          <button
            onClick={handleOpenLibrary}
            className={cn(
              'p-2 rounded-full transition-all duration-200 relative cursor-pointer',
              'text-foreground/60 hover:text-foreground hover:bg-foreground/10',
              isAuthenticated && tracks.length > 0 && 'text-accent/80 hover:text-accent'
            )}
            title="Ma bibliothèque"
            aria-label="Ouvrir ma bibliothèque"
          >
            <Library className="w-5 h-5" />
          </button>

          {/* Listeners + LIVE */}
          {np?.listeners ? (
            <div
              className="flex items-center gap-1.5 text-xs text-foreground/50"
              aria-live="polite"
              aria-atomic="true"
            >
              {np.live.is_live && (
                <span className="flex items-center gap-1 text-danger font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                  LIVE
                </span>
              )}
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">Auditeurs : </span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={np.listeners.current}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={dataTick}
                  className="tabular-nums"
                >
                  {np.listeners.current}
                </motion.span>
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </div>

      {/* Section 5: Artist Context */}
      <ArtistContext artistName={nowPlaying?.song.artist} />

      {/* Section 6: History */}
      {(() => {
        const historyEntries = np?.song_history?.slice(0, 5);
        if (!historyEntries || historyEntries.length === 0) return null;
        return (
          <div className="border-t border-foreground/10 pt-4">
            <p id="history-label" className="text-xs text-foreground/50 mb-2">
              Historique
            </p>
            <div role="list" aria-labelledby="history-label">
              {historyEntries.map((entry, index) => (
                <motion.div
                  key={entry.sh_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                >
                  <HistoryItem
                    entry={entry}
                    isLiked={isHistoryTrackLiked(entry)}
                    isLiking={likingTrackId === `${entry.song.title}-${entry.song.artist}`}
                    onToggle={() => {
                      void toggleLike(entry.song.title, entry.song.artist, entry.song.art);
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        );
      })()}

      {isModalOpen && (
        <Suspense fallback={null}>
          <ErrorBoundary
            FallbackComponent={(props) => (
              <ModalErrorFallback {...props} onClose={() => setIsModalOpen(false)} />
            )}
          >
            <LikedTracksModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          </ErrorBoundary>
        </Suspense>
      )}

      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <ErrorBoundary
            FallbackComponent={(props) => (
              <ModalErrorFallback {...props} onClose={() => setIsAuthModalOpen(false)} />
            )}
          >
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
          </ErrorBoundary>
        </Suspense>
      )}
    </div>
  );
}
