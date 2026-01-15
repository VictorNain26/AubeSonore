import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Radio, Users, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayer, getAnalyser } from '../lib/player';
import { useNowPlaying, type SongEntry } from '../lib/azuracast';

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
}

function HistoryItem({ entry }: HistoryItemProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-3 py-2">
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
      // Créer une forme de waveform naturelle (plus haute au centre)
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

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop when not dragging
  useEffect(() => {
    if (!isDragging) setLocalValue(value);
  }, [value, isDragging]);

  const updateValue = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setLocalValue(percent);
    onChange(percent);
  }, [onChange]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateValue(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updateValue(touch.clientX);
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
  }, [isDragging, updateValue]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValue(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    updateValue(touch.clientX);
  };

  const displayValue = localValue;

  return (
    <div
      ref={sliderRef}
      className={cn(
        'relative h-2 flex-1 rounded-full group',
        'bg-white/10',
        isDragging ? 'cursor-grabbing' : 'cursor-pointer'
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Track fill - no transition during drag for instant feedback */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-full bg-white/50',
          !isDragging && 'transition-[width] duration-100'
        )}
        style={{ width: `${displayValue * 100}%` }}
      />
      {/* Thumb */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg',
          'bg-white',
          'transition-opacity duration-150',
          isDragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
        )}
        style={{ left: `calc(${displayValue * 100}% - 8px)` }}
      />
    </div>
  );
}

export default function Player() {
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [artError, setArtError] = useState(false);

  const { isPlaying, volume, play, stop, setVolume } = usePlayer();
  const { data: np, isConnected } = useNowPlaying();
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

  // Smooth animation loop for elapsed time
  useEffect(() => {
    if (isPlaying && duration > 0) {
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
  }, [isPlaying, duration]);

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

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Playlist badge */}
      {playlistName && (
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 backdrop-blur-sm rounded-full text-xs text-muted-foreground border border-white/10">
            <Music className="w-3 h-3" />
            {playlistName}
          </span>
        </div>
      )}

      {/* Album Art */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-6">
          <div
            className={cn(
              'w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden',
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
          </div>

          {/* Live indicator */}
          {np?.live.is_live && (
            <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 rounded-full text-xs font-medium text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="text-center w-full max-w-sm">
          <h2 className="text-lg md:text-xl font-medium text-foreground truncate px-2">
            {nowPlaying?.song.title || 'En attente...'}
          </h2>
          <p className="text-sm text-muted-foreground truncate px-2 mt-1">
            {nowPlaying?.song.artist || '—'}
          </p>
        </div>
      </div>

      {/* Waveform Progress avec temps */}
      <div className="flex items-center gap-3 mb-6">
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

      {/* Play/Pause Button */}
      <div className="flex items-center justify-center mb-6">
        <button
          onClick={togglePlay}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            'bg-white/10 backdrop-blur-md border border-white/20',
            'hover:bg-white/20 hover:scale-105 active:scale-95',
            'transition-all duration-200',
            'shadow-lg shadow-black/20'
          )}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-white" />
          ) : (
            <Play className="w-7 h-7 text-white ml-1" />
          )}
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mb-6 px-2">
        <button
          onClick={toggleMute}
          className="text-white/60 hover:text-white transition-colors shrink-0"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
        <VolumeSlider value={volume} onChange={handleVolumeChange} />
        <span className="text-xs text-white/40 w-8 text-right tabular-nums shrink-0">
          {Math.round(volume * 100)}
        </span>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mb-4">
        {np?.listeners && (
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{np.listeners.current} auditeur{np.listeners.current > 1 ? 's' : ''}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )} />
          <span>{isConnected ? 'Connecté' : 'Déconnecté'}</span>
        </div>
      </div>

      {/* Dernier morceau joué */}
      {np?.song_history?.[0] && (
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>Précédemment</span>
          </div>
          <HistoryItem entry={np.song_history[0]} />
        </div>
      )}
    </div>
  );
}
