import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Square, Users, Music, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayer } from '../../lib/player';
import { useNowPlaying, type SongEntry } from '../../lib/azuracast';
import { useLikedTracks } from '../../hooks/useLikedTracks';
import { useAuth } from '../../hooks/useAuth';
import { LikedTracksModal } from '../LikedTracksModal';
import { AuthModal } from '../AuthModal';
import toast from 'react-hot-toast';

// Sub-components
import { formatTime } from './utils';
import { WaveformProgress } from './WaveformProgress';
import { VolumeControl } from './VolumeControl';
import { HistoryItem } from './HistoryItem';
import { AlbumArt } from './AlbumArt';
import { CastButton } from './CastButton';

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
  const { data: np } = useNowPlaying();
  const { likeTrack, unlikeTrack, isTrackLiked, tracks } = useLikedTracks();
  const { isAuthenticated } = useAuth();
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0);

  const nowPlaying = np?.now_playing;
  const duration = nowPlaying?.duration || 0;
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  // Sync with server elapsed time
  useEffect(() => {
    if (nowPlaying?.elapsed !== undefined) {
      baseElapsedRef.current = nowPlaying.elapsed;
      startTimeRef.current = performance.now();
      setElapsed(nowPlaying.elapsed);
    }
  }, [nowPlaying?.elapsed, nowPlaying?.sh_id]);

  // Smooth animation loop for elapsed time - always runs (live radio)
  useEffect(() => {
    if (duration > 0) {
      startTimeRef.current = performance.now();

      const animate = () => {
        const now = performance.now();
        const deltaSeconds = (now - startTimeRef.current) / 1000;
        const newElapsed = Math.min(baseElapsedRef.current + deltaSeconds, duration);
        setElapsed(newElapsed);
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [duration]);

  const togglePlay = useCallback(() => {
    isPlaying ? stop() : play();
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

  const handleVolumeChange = useCallback((val: number) => {
    setVolume(val);
    setIsMuted(val === 0);
    if (val > 0) setPrevVolume(val);
  }, [setVolume]);

  const playlistName = nowPlaying?.playlist?.replace(/_/g, ' ');

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

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* =================================================================
          SECTION 1: Album Art (Focal Point) + Like Button
          ================================================================= */}
      <div className="flex flex-col items-center mb-5">
        <AlbumArt
          artUrl={nowPlaying?.song.art}
          title={nowPlaying?.song.title}
          isPlaying={isPlaying}
          isLiked={isCurrentTrackLiked}
          isLiking={likingTrackId === `${nowPlaying?.song.title}-${nowPlaying?.song.artist}`}
          isLive={np?.live.is_live}
          onToggleLike={() =>
            nowPlaying &&
            handleToggleLike(
              nowPlaying.song.title,
              nowPlaying.song.artist,
              nowPlaying.song.art
            )
          }
        />
      </div>

      {/* =================================================================
          SECTION 2: Track Info
          ================================================================= */}
      <div className="text-center mb-5">
        <h2 className="text-lg md:text-xl font-medium text-foreground truncate">
          {nowPlaying?.song.title || 'En attente...'}
        </h2>
        <p className="text-sm text-muted-foreground truncate px-2 mt-0.5">
          {nowPlaying?.song.artist || '—'}
        </p>
      </div>

      {/* =================================================================
          SECTION 3: Waveform Progress
          ================================================================= */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
          {formatTime(elapsed)}
        </span>
        <div className="flex-1">
          <WaveformProgress
            progress={progress}
            isPlaying={isPlaying}
            songId={nowPlaying?.sh_id}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* =================================================================
          SECTION 4: Playback Controls

          Best Practice: "True center" with unequal siblings
          Pattern: flex-1 on sides + shrink-0 on center
          Source: https://chrisbracco.com/css-truly-center-a-single-child-element-horizontally-when-siblings-are-present/

          [flex-1 justify-start] — [shrink-0 center] — [flex-1 justify-end]
          ================================================================= */}
      <div className="flex items-center mb-6 px-2">
        {/* Left: flex-1 distributes equal space, justify-start aligns content */}
        <div className="flex-1 flex justify-start items-center gap-1">
          <CastButton />
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
          />
        </div>

        {/* Center: shrink-0 prevents shrinking, truly centered */}
        <button
          onClick={togglePlay}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center shrink-0 cursor-pointer',
            'border border-white/20 transition-all duration-200',
            'hover:scale-105 hover:bg-white/10 active:scale-95',
            'bg-white/5 backdrop-blur-sm'
          )}
          aria-label={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? (
            <Square className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </button>

        {/* Right: flex-1 distributes equal space, justify-end aligns content */}
        <div className="flex-1 flex justify-end items-center gap-2">
          {/* Library button - opens saved tracks */}
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
            {isAuthenticated && tracks.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-medium">
                {tracks.length > 9 ? '9+' : tracks.length}
              </span>
            )}
          </button>

          {/* Listeners count */}
          {np?.listeners ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{np.listeners.current}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* =================================================================
          SECTION 5: Playlist Badge (Subtle)
          ================================================================= */}
      {playlistName && (
        <div className="flex justify-center mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-xs text-muted-foreground">
            <Music className="w-3 h-3" />
            {playlistName}
          </span>
        </div>
      )}

      {/* =================================================================
          SECTION 6: History (Previous Track)
          ================================================================= */}
      {(() => {
        const historyEntry = np?.song_history?.[0];
        if (!historyEntry) return null;
        return (
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-muted-foreground mb-2">Précédemment</p>
            <HistoryItem
              entry={historyEntry}
              isLiked={isHistoryTrackLiked(historyEntry)}
              isLiking={likingTrackId === `${historyEntry.song.title}-${historyEntry.song.artist}`}
              onToggle={() =>
                handleToggleLike(
                  historyEntry.song.title,
                  historyEntry.song.artist,
                  historyEntry.song.art
                )
              }
            />
          </div>
        );
      })()}

      {/* =================================================================
          MODAL: Liked Tracks
          ================================================================= */}
      <LikedTracksModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* =================================================================
          MODAL: Authentication
          ================================================================= */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
