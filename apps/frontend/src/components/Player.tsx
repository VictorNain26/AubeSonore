import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayer } from '../lib/player';
import { AZURACAST_URL } from '../utils/config';

interface Song {
  title: string;
  artist: string;
  art?: string;
}

interface NowPlayingData {
  now_playing?: {
    song?: Song;
    elapsed?: number;
    duration?: number;
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function Player() {
  const [song, setSong] = useState<Song | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);

  const { isPlaying, volume, play, stop, setVolume } = usePlayer();
  const eventSourceRef = useRef<EventSource | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  // SSE connection for now playing
  useEffect(() => {
    const connect = () => {
      eventSourceRef.current = new EventSource(
        `${AZURACAST_URL}/api/live/nowplaying/sse`
      );

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const np: NowPlayingData | undefined =
            data.connect?.data?.[0]?.data?.np || data.pub?.data?.np;

          if (np?.now_playing) {
            setSong(np.now_playing.song || null);
            setElapsed(np.now_playing.elapsed || 0);
            setDuration(np.now_playing.duration || 0);
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSourceRef.current.onerror = () => {
        eventSourceRef.current?.close();
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => eventSourceRef.current?.close();
  }, []);

  // Progress timer
  useEffect(() => {
    if (isPlaying && duration > 0) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => Math.min(prev + 1, duration));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value) / 100;
      setVolume(val);
      setIsMuted(val === 0);
      if (val > 0) setPrevVolume(val);
    },
    [setVolume]
  );

  return (
    <div className="w-full max-w-md mx-auto px-6">
      {/* Vinyl */}
      <div className="relative flex items-center justify-center mb-10">
        <div
          className={cn(
            'w-64 h-64 rounded-full relative',
            'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
            'border border-white/5 shadow-2xl',
            isPlaying ? 'vinyl-spin' : 'vinyl-spin vinyl-spin-paused'
          )}
        >
          {/* Grooves */}
          {[4, 8, 12, 16].map((inset) => (
            <div
              key={inset}
              className="absolute rounded-full border border-white/5"
              style={{ inset: `${inset * 4}px` }}
            />
          ))}

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-800">
              {song?.art ? (
                <img src={song.art} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/60 to-accent/40" />
              )}
            </div>
          </div>

          {/* Center hole */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3 h-3 rounded-full bg-background" />
          </div>
        </div>

        {/* Glow */}
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 rounded-full bg-primary/10 blur-3xl breathe" />
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="text-center mb-8 space-y-2">
        <h2 className="text-xl font-light text-foreground tracking-wide">
          {song?.title || 'En attente...'}
        </h2>
        <p className="text-sm text-muted-foreground">{song?.artist || '—'}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8 space-y-2">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(elapsed)}</span>
          <span>{duration > 0 ? formatTime(duration) : '—:——'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={togglePlay}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            'bg-primary/10 border border-primary/30 text-primary',
            'hover:bg-primary/20 hover:border-primary/50 transition-all',
            isPlaying && 'glow-soft'
          )}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </button>

        {/* Volume */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <button
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={handleVolumeChange}
            className="flex-1"
          />

          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {Math.round(volume * 100)}
          </span>
        </div>
      </div>

      {/* Live indicator */}
      {isPlaying && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            En direct
          </span>
        </div>
      )}
    </div>
  );
}
