import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Square, Volume2, VolumeX, Radio, Users, Music, Heart, Library, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayer, getAnalyser } from '../lib/player';
import { useNowPlaying, type SongEntry } from '../lib/azuracast';
import { useLikedTracks } from '../hooks/useLikedTracks';
import { useAuth } from '../hooks/useAuth';
import { LikedTracksModal } from './LikedTracksModal';
import { AuthModal } from './AuthModal';
import toast from 'react-hot-toast';

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  return `Il y a ${Math.floor(diff / 3600)}h`;
}

interface HistoryItemProps {
  entry: SongEntry;
  isLiked: boolean;
  isLiking: boolean;
  onLike: () => void;
}

function HistoryItem({ entry, isLiked, isLiking, onLike }: HistoryItemProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-3 py-2 group">
      <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-secondary flex items-center justify-center">
        {entry.song.art && !imgError ? (
          <img
            src={entry.song.art}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{entry.song.title}</p>
        <p className="text-xs text-muted-foreground truncate">{entry.song.artist}</p>
      </div>
      <button
        onClick={onLike}
        disabled={isLiking}
        className={cn(
          'p-1.5 rounded-full transition-all',
          'opacity-0 group-hover:opacity-100',
          isLiked
            ? 'text-red-400 opacity-100'
            : 'text-white/40 hover:text-red-400',
          isLiking && 'animate-pulse'
        )}
        title={isLiked ? 'Déjà liké' : 'Ajouter aux favoris'}
      >
        <Heart className={cn('w-4 h-4', isLiked && 'fill-current')} />
      </button>
      <span className="text-xs text-muted-foreground shrink-0">
        {formatTimeAgo(entry.played_at)}
      </span>
    </div>
  );
}

// Waveform avec progression intégrée
interface WaveformProgressProps {
  progress: number;
  isPlaying: boolean;
  songId: number | undefined;
}

function WaveformProgress({ progress, isPlaying, songId }: WaveformProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const waveformRef = useRef<number[]>([]);
  const barsCount = 64;

  // Générer une waveform pseudo-aléatoire basée sur le songId
  useEffect(() => {
    const seed = songId || Date.now();
    const waveform: number[] = [];

    for (let i = 0; i < barsCount; i++) {
      const centerFactor = 1 - Math.abs(i - barsCount / 2) / (barsCount / 2) * 0.3;
      const random = Math.sin(seed * (i + 1) * 0.1) * 0.5 + 0.5;
      const variation = Math.sin(i * 0.5) * 0.2 + 0.8;
      waveform.push(Math.max(0.15, Math.min(1, random * centerFactor * variation)));
    }

    waveformRef.current = waveform;
  }, [songId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const analyser = getAnalyser();
      const width = canvas.width;
      const height = canvas.height;
      const waveform = waveformRef.current;

      ctx.clearRect(0, 0, width, height);

      const barWidth = width / barsCount;
      const gap = 2;
      const progressX = (progress / 100) * width;

      for (let i = 0; i < barsCount; i++) {
        const x = i * barWidth;
        const baseHeight = (waveform[i] || 0.5) * height * 0.85;

        let barHeight = baseHeight;

        // Animation temps réel si lecture en cours
        if (analyser && isPlaying) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const dataIndex = Math.floor((i / barsCount) * dataArray.length);
          const audioValue = (dataArray[dataIndex] || 0) / 255;
          barHeight = baseHeight * (0.4 + audioValue * 0.6);
        }

        const y = (height - barHeight) / 2;
        const barX = x + gap / 2;
        const barW = barWidth - gap;

        // Partie colorée (progression)
        if (x < progressX) {
          const fillWidth = Math.min(barW, progressX - barX);
          if (fillWidth > 0) {
            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0.9)');
            gradient.addColorStop(0.5, 'rgba(168, 85, 247, 1)');
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0.9)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(barX, y, fillWidth, barHeight, 2);
            ctx.fill();
          }
        }

        // Partie non colorée (reste)
        if (x + barW > progressX) {
          const startX = Math.max(barX, progressX);
          const remainingWidth = barX + barW - startX;
          if (remainingWidth > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.roundRect(startX, y, remainingWidth, barHeight, 2);
            ctx.fill();
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, progress]);

  return (
    <canvas
      ref={canvasRef}
      width={384}
      height={56}
      className="w-full h-14"
    />
  );
}

// =============================================================================
// VOLUME CONTROL - Expert UX/UI Implementation
// Pattern: Overlay slider (no layout shift)
// Features: 44px touch target, mobile tap toggle, keyboard support, ARIA
// =============================================================================

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
}

function VolumeControl({ volume, isMuted, onVolumeChange, onToggleMute }: VolumeControlProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile (no hover)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(hover: none)').matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile || isDragging) return;
    // Delay before closing to allow reaching the slider
    closeTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 300);
  };

  // Sync local volume with prop when not dragging
  useEffect(() => {
    if (!isDragging) setLocalVolume(volume);
  }, [volume, isDragging]);

  // Close slider when clicking outside (mobile)
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  // Calculate volume from vertical position (bottom = 0, top = 1)
  const calculateVolumeVertical = useCallback((clientY: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    // Invert: top of slider = 100%, bottom = 0%
    const percent = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
    setLocalVolume(percent);
    onVolumeChange(percent);
  }, [onVolumeChange]);

  // Handle drag events (vertical)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      calculateVolumeVertical(e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) calculateVolumeVertical(touch.clientY);
    };
    const handleEnd = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, calculateVolumeVertical]);

  // Keyboard support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.05;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const newVolume = Math.min(1, localVolume + step);
      setLocalVolume(newVolume);
      onVolumeChange(newVolume);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const newVolume = Math.max(0, localVolume - step);
      setLocalVolume(newVolume);
      onVolumeChange(newVolume);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      onToggleMute();
    }
  }, [localVolume, onVolumeChange, onToggleMute]);

  const handleSliderInteractionVertical = (clientY: number) => {
    setIsDragging(true);
    calculateVolumeVertical(clientY);
  };

  // Icon click: mobile = toggle slider, desktop = mute
  const handleIconClick = () => {
    if (isMobile) {
      setIsOpen(prev => !prev);
    } else {
      onToggleMute();
    }
  };

  const displayVolume = localVolume;
  const isExpanded = isOpen || isDragging || (!isMobile && containerRef.current?.matches(':hover'));
  const showMuted = isMuted || displayVolume === 0;
  const VolumeIcon = showMuted ? VolumeX : Volume2;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
      aria-label="Volume control"
    >
      {/* Volume Icon Button - Fixed position, never moves */}
      <button
        onClick={handleIconClick}
        className={cn(
          'p-2 rounded-full transition-all duration-200',
          'text-white/60 hover:text-white hover:bg-white/10',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
        )}
        aria-label={showMuted ? 'Unmute' : 'Mute'}
        title={isMobile ? 'Volume' : (showMuted ? 'Unmute (M)' : 'Mute (M)')}
      >
        <VolumeIcon className="w-5 h-5" />
      </button>

      {/* Slider - Absolute positioned overlay, opens UPWARD */}
      <div
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
          'transition-all duration-200 ease-out',
          isExpanded
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none translate-y-2'
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="bg-black/80 backdrop-blur-md rounded-xl p-3 shadow-lg border border-white/10">
          {/* Vertical Slider Track */}
          <div
            ref={sliderRef}
            className="relative w-1.5 h-24 rounded-full cursor-pointer bg-white/20"
            onMouseDown={(e) => handleSliderInteractionVertical(e.clientY)}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              if (touch) handleSliderInteractionVertical(touch.clientY);
            }}
            role="slider"
            aria-label="Volume"
            aria-valuenow={Math.round(displayVolume * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-orientation="vertical"
          >
            {/* Track Fill (from bottom) */}
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 rounded-full bg-white/80',
                !isDragging && 'transition-[height] duration-75'
              )}
              style={{ height: `${displayVolume * 100}%` }}
            />

            {/* Thumb with 44px touch target */}
            <div
              className="absolute left-1/2 -translate-x-1/2 translate-y-1/2"
              style={{ bottom: `${displayVolume * 100}%` }}
            >
              {/* Touch target (44px) */}
              <div className="absolute w-11 h-11 -top-5 -left-5" />
              {/* Visible thumb */}
              <div
                className={cn(
                  'w-3 h-3 rounded-full bg-white shadow-md',
                  'transition-transform duration-150',
                  isDragging && 'scale-125'
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Player() {
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [artError, setArtError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [likingTrackId, setLikingTrackId] = useState<string | null>(null);

  const { isPlaying, volume, play, stop, setVolume } = usePlayer();
  const { data: np } = useNowPlaying();
  const { likeTrack, isTrackLiked, tracks } = useLikedTracks();
  const { isAuthenticated } = useAuth();
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0);

  const nowPlaying = np?.now_playing;
  const duration = nowPlaying?.duration || 0;
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  // Reset art error when song changes
  useEffect(() => {
    setArtError(false);
  }, [nowPlaying?.sh_id]);

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

  // Handle like for any track (current or history)
  const handleLikeTrack = useCallback(
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
      } finally {
        setLikingTrackId(null);
      }
    },
    [likeTrack, likingTrackId, isAuthenticated]
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
        <div className="relative group">
          <div
            className={cn(
              'w-52 h-52 md:w-60 md:h-60 rounded-2xl overflow-hidden',
              'shadow-2xl border border-white/10',
              'transition-transform duration-500',
              isPlaying && 'scale-[1.02]'
            )}
          >
            {nowPlaying?.song.art && !artError ? (
              <img
                src={nowPlaying.song.art}
                alt={nowPlaying.song.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setArtError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/20 flex items-center justify-center">
                <Radio className="w-16 h-16 text-foreground/30" />
              </div>
            )}

            {/* Like button overlay - appears on hover */}
            {nowPlaying && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-end justify-end p-3">
                <button
                  onClick={() =>
                    handleLikeTrack(
                      nowPlaying.song.title,
                      nowPlaying.song.artist,
                      nowPlaying.song.art
                    )
                  }
                  disabled={likingTrackId === `${nowPlaying.song.title}-${nowPlaying.song.artist}`}
                  className={cn(
                    'p-3 rounded-full transition-all duration-300',
                    'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0',
                    'backdrop-blur-md shadow-lg',
                    isCurrentTrackLiked
                      ? 'bg-red-500 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30',
                    likingTrackId === `${nowPlaying.song.title}-${nowPlaying.song.artist}` && 'animate-pulse'
                  )}
                  title={isCurrentTrackLiked ? 'Déjà dans votre bibliothèque' : 'Ajouter à ma bibliothèque'}
                >
                  {isCurrentTrackLiked ? (
                    <Heart className="w-5 h-5 fill-current" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Live indicator */}
          {np?.live.is_live && (
            <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 rounded-full text-xs font-medium text-white flex items-center gap-1 z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          )}
        </div>
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
        <div className="flex-1 flex justify-start">
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
            'w-14 h-14 rounded-full flex items-center justify-center shrink-0',
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
              'p-2 rounded-full transition-all duration-200 relative',
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
              onLike={() =>
                handleLikeTrack(
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
