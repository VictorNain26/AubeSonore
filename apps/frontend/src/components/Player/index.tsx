import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Play, Square, Users, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalErrorFallback } from '../ErrorFallback';
import { cn } from '@/lib/utils';
import { usePlayer } from '../../lib/player';
import { useNowPlaying, type SongEntry } from '../../lib/azuracast';
import { useLikedTracksContext as useLikedTracks } from '../../contexts/LikedTracksContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const LikedTracksModal = lazy(() =>
  import('../LikedTracksModal').then((m) => ({ default: m.LikedTracksModal }))
);
const AuthModal = lazy(() => import('../AuthModal').then((m) => ({ default: m.AuthModal })));

// Sub-components
import { formatTime } from '@aubesonore/core/format';
import { WaveformProgress } from './WaveformProgress';
import { VolumeControl } from './VolumeControl';
import { HistoryItem } from './HistoryItem';
import { AlbumArt } from './AlbumArt';
import { CastButton } from './CastButton';
import { SleepTimer } from './SleepTimer';
import { ArtistContext } from './ArtistContext';

// Stores
import { useSleepTimer } from '../../stores/sleepTimerStore';
import { useStatsStore } from '../../stores/statsStore';

// ─────────────────────────────────────────────
// Main Player Component
// ─────────────────────────────────────────────

export default function Player() {
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [likingTrackId, setLikingTrackId] = useState<string | null>(null);
  const { isPlaying, volume, play, stop, setVolume } = usePlayer();
  const playError = usePlayer((s) => s.playError);
  const clearPlayError = usePlayer((s) => s.clearPlayError);
  const { data: np } = useNowPlaying();
  const { likeTrack, unlikeTrack, isTrackLiked, tracks } = useLikedTracks();
  const { isAuthenticated } = useAuth();
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0);
  const prevShIdRef = useRef<number | undefined>(undefined);

  const nowPlaying = np?.now_playing;
  const duration = nowPlaying?.duration || 0;
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  // Sleep timer — end-of-track mode
  const sleepTimerTrigger = useSleepTimer((s) => s.triggerEndOfTrack);

  // Stats store
  const tickListeningTime = useStatsStore((s) => s.tickListeningTime);
  const recordTrackChange = useStatsStore((s) => s.recordTrackChange);

  // Sync with server elapsed time (store in ref, don't setState in effect)
  useEffect(() => {
    if (nowPlaying?.elapsed !== undefined) {
      baseElapsedRef.current = nowPlaying.elapsed;
      startTimeRef.current = performance.now();
    }
  }, [nowPlaying?.elapsed, nowPlaying?.sh_id]);

  // Smooth animation loop for elapsed time - runs only while playing
  useEffect(() => {
    if (!isPlaying || duration <= 0) return;

    startTimeRef.current = performance.now();
    const animate = () => {
      const now = performance.now();
      const deltaSeconds = (now - startTimeRef.current) / 1000;
      const newElapsed = Math.min(baseElapsedRef.current + deltaSeconds, duration);
      setElapsed(newElapsed);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [duration, isPlaying]);

  // Track change detection — stats + sleep timer end-of-track
  useEffect(() => {
    const shId = nowPlaying?.sh_id;
    if (shId && shId !== prevShIdRef.current) {
      if (prevShIdRef.current !== undefined) {
        // Track changed
        sleepTimerTrigger();
        if (nowPlaying?.song.artist && nowPlaying?.song.title) {
          recordTrackChange(nowPlaying.song.artist, nowPlaying.song.title);
        }
      }
      prevShIdRef.current = shId;
    }
  }, [
    nowPlaying?.sh_id,
    nowPlaying?.song.artist,
    nowPlaying?.song.title,
    sleepTimerTrigger,
    recordTrackChange,
  ]);

  // Stats: tick listening time every 10s while playing
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      void tickListeningTime();
    }, 10_000);
    return () => clearInterval(id);
  }, [isPlaying, tickListeningTime]);

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

  // Check if current track is liked
  const isCurrentTrackLiked = nowPlaying
    ? isTrackLiked(nowPlaying.song.title, nowPlaying.song.artist)
    : false;

  // Handle toggle like/unlike for any track (current or history)
  const handleToggleLike = useCallback(
    async (title: string, artist: string, artworkUrl?: string) => {
      // Check authentication first
      if (!isAuthenticated) {
        setIsAuthModalOpen(true);
        return;
      }

      const trackKey = `${title}-${artist}`;
      if (likingTrackId === trackKey) return; // Prevent double-click

      setLikingTrackId(trackKey);
      try {
        // Check if already liked
        const existingTrack = tracks.find(
          (t) =>
            t.title.toLowerCase() === title.toLowerCase() &&
            t.artist.toLowerCase() === artist.toLowerCase()
        );

        if (existingTrack) {
          // Unlike
          const success = await unlikeTrack(existingTrack.id);
          if (success) {
            toast.success('Retiré de votre bibliothèque');
          }
        } else {
          // Like
          const requestData: Parameters<typeof likeTrack>[0] = {
            title,
            artist,
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`)}`,
          };
          if (artworkUrl) {
            requestData.artworkUrl = artworkUrl;
          }
          await likeTrack(requestData);
          toast.success('Ajouté à votre bibliothèque');
        }
      } finally {
        setLikingTrackId(null);
      }
    },
    [likeTrack, unlikeTrack, tracks, likingTrackId, isAuthenticated]
  );

  // Handle opening library modal
  const handleOpenLibrary = useCallback(() => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsModalOpen(true);
  }, [isAuthenticated]);

  // Check if a history track is liked
  const isHistoryTrackLiked = useCallback(
    (entry: SongEntry) => isTrackLiked(entry.song.title, entry.song.artist),
    [isTrackLiked]
  );

  // Skeleton loading state
  if (!np) {
    return (
      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4">
        {/* Album art skeleton */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-64 h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-2xl skeleton" />
        </div>
        {/* Title skeleton */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="h-6 w-48 rounded skeleton" />
          <div className="h-4 w-32 rounded skeleton" />
        </div>
        {/* Waveform skeleton */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-3 w-10 rounded skeleton" />
          <div className="flex-1 h-8 rounded skeleton" />
          <div className="h-3 w-10 rounded skeleton" />
        </div>
        {/* Controls skeleton */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4">
      {/* =================================================================
          SECTION 1: Album Art (Focal Point) + Like/Share Buttons
          ================================================================= */}
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
              void handleToggleLike(
                nowPlaying.song.title,
                nowPlaying.song.artist,
                nowPlaying.song.art
              );
            }
          }}
        />
      </div>

      {/* =================================================================
          SECTION 2: Track Info
          ================================================================= */}
      <AnimatePresence mode="wait">
        <motion.div
          key={nowPlaying?.sh_id || 'waiting'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-5"
        >
          <h2 className="text-lg md:text-xl font-medium text-foreground truncate">
            {nowPlaying?.song.title || 'En attente...'}
          </h2>
          <p className="text-sm text-muted-foreground truncate px-2 mt-0.5">
            {nowPlaying?.song.artist || '—'}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* =================================================================
          SECTION 4: Waveform Progress
          ================================================================= */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
          {formatTime(elapsed)}
        </span>
        <div className="flex-1">
          <WaveformProgress progress={progress} isPlaying={isPlaying} songId={nowPlaying?.sh_id} />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* =================================================================
          SECTION 5: Playback Controls
          ================================================================= */}
      <div className="flex items-center mb-6 px-2">
        {/* Left controls */}
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

        {/* Center: Play/Stop */}
        <button
          onClick={togglePlay}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center shrink-0 cursor-pointer',
            'border border-white/20 transition-all duration-200',
            'hover:scale-105 hover:bg-white/15 active:scale-95',
            'bg-white/10 backdrop-blur-sm',
            isPlaying && 'animate-pulse-ring'
          )}
          aria-label={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? (
            <Square className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-7 h-7 text-white ml-0.5" />
          )}
        </button>

        {/* Right controls */}
        <div className="flex-1 flex justify-end items-center gap-2">
          {/* Library button */}
          <button
            onClick={handleOpenLibrary}
            className={cn(
              'p-2 rounded-full transition-all duration-200 relative cursor-pointer',
              'text-white/60 hover:text-white hover:bg-white/10',
              isAuthenticated && tracks.length > 0 && 'text-purple-400/80 hover:text-purple-400'
            )}
            title="Ma bibliothèque"
          >
            <Library className="w-5 h-5" />
          </button>

          {/* Listeners count + LIVE indicator */}
          {np?.listeners ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {np.live.is_live && (
                <span className="flex items-center gap-1 text-red-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
              )}
              <Users className="w-3.5 h-3.5" />
              <span>{np.listeners.current}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* =================================================================
          SECTION 7: Artist Context
          ================================================================= */}
      <ArtistContext artistName={nowPlaying?.song.artist} />

      {/* =================================================================
          SECTION 8: History (Previous Tracks)
          ================================================================= */}
      {(() => {
        const historyEntries = np?.song_history?.slice(0, 5);
        if (!historyEntries || historyEntries.length === 0) return null;
        return (
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-muted-foreground mb-2">Historique</p>
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
                    void handleToggleLike(entry.song.title, entry.song.artist, entry.song.art);
                  }}
                />
              </motion.div>
            ))}
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
