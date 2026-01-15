import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlayerService, usePlayerStore } from '../lib/playerService';
import { AZURACAST_URL } from '../utils/config';

interface NowPlayingData {
  station?: { name: string };
  now_playing?: {
    song?: {
      title: string;
      artist: string;
      art?: string;
    };
    elapsed?: number;
    duration?: number;
  };
}

interface SSEMessage {
  connect?: { data?: Array<{ data?: { np?: NowPlayingData } }> };
  pub?: { data?: { np?: NowPlayingData } };
}

const MusicPlayer: React.FC = () => {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const { isPlaying, volume, setVolume } = usePlayerStore();
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [previousVolume, setPreviousVolume] = useState<number>(volume);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const togglePlay = (): void => {
    if (isPlaying) {
      PlayerService.stop();
    } else {
      PlayerService.play();
    }
  };

  const toggleMute = (): void => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const vol = parseInt(e.target.value);
    setVolume(vol / 100);
    setIsMuted(vol === 0);
    if (vol > 0) setPreviousVolume(vol / 100);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (elapsed / duration) * 100 : 0;

  // SSE Connection
  useEffect(() => {
    const connectToSSE = (): void => {
      try {
        eventSourceRef.current = new EventSource(`${AZURACAST_URL}/api/live/nowplaying/sse`);

        eventSourceRef.current.onmessage = (event): void => {
          try {
            const data: SSEMessage = JSON.parse(event.data);
            let np: NowPlayingData | null = null;

            if (data.connect?.data?.[0]?.data?.np) {
              np = data.connect.data[0].data.np;
            } else if (data.pub?.data?.np) {
              np = data.pub.data.np;
            }

            if (np) {
              setNowPlaying(np);
              if (np.now_playing?.elapsed !== undefined) setElapsed(np.now_playing.elapsed);
              if (np.now_playing?.duration !== undefined) setDuration(np.now_playing.duration);
            }
          } catch {
            // Silent
          }
        };

        eventSourceRef.current.onerror = (): void => {
          eventSourceRef.current?.close();
          setTimeout(connectToSSE, 3000);
        };
      } catch {
        setTimeout(connectToSSE, 5000);
      }
    };

    connectToSSE();
    return (): void => { eventSourceRef.current?.close(); };
  }, []);

  // Progress timer
  useEffect(() => {
    if (isPlaying && duration > 0) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => (prev + 1 <= duration ? prev + 1 : duration));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return (): void => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, duration]);

  const song = nowPlaying?.now_playing?.song;

  return (
    <div className="w-full max-w-md mx-auto px-6">
      {/* Vinyl / Album Art */}
      <div className="relative flex items-center justify-center mb-10">
        {/* Vinyl disc */}
        <div
          className={cn(
            'w-64 h-64 rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
            'border border-white/5 shadow-2xl relative',
            isPlaying ? 'vinyl-spin' : 'vinyl-spin vinyl-spin-paused'
          )}
        >
          {/* Vinyl grooves */}
          <div className="absolute inset-4 rounded-full border border-white/5" />
          <div className="absolute inset-8 rounded-full border border-white/5" />
          <div className="absolute inset-12 rounded-full border border-white/5" />
          <div className="absolute inset-16 rounded-full border border-white/5" />

          {/* Center label with album art */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-800 shadow-inner">
              {song?.art ? (
                <img src={song.art} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/60 to-accent/40" />
              )}
            </div>
          </div>

          {/* Center hole */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-background" />
          </div>
        </div>

        {/* Glow effect */}
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 rounded-full bg-primary/10 blur-3xl breathe" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="text-center mb-8 space-y-2">
        <h2 className="text-xl font-light text-foreground tracking-wide">
          {song?.title || 'En attente...'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {song?.artist || '—'}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8 space-y-2">
        <div className="relative h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(elapsed)}</span>
          <span>{duration > 0 ? formatTime(duration) : '—:——'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-6">
        {/* Play Button */}
        <button
          onClick={togglePlay}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            'bg-primary/10 border border-primary/30 text-primary',
            'hover:bg-primary/20 hover:border-primary/50 transition-all duration-300',
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
};

export default MusicPlayer;
