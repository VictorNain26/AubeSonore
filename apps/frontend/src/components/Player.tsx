import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Radio, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayer } from '../lib/player';
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
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-secondary">
        {entry.song.art && (
          <img src={entry.song.art} alt="" className="w-full h-full object-cover" />
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

export default function Player() {
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);

  const { isPlaying, volume, play, stop, setVolume } = usePlayer();
  const { data: np, isConnected } = useNowPlaying();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const nowPlaying = np?.now_playing;
  const duration = nowPlaying?.duration || 0;
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  // Sync elapsed time from SSE data
  useEffect(() => {
    if (nowPlaying?.elapsed !== undefined) {
      setElapsed(nowPlaying.elapsed);
    }
  }, [nowPlaying?.elapsed, nowPlaying?.sh_id]);

  // Local timer for smooth progress
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
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Album Art + Now Playing */}
      <div className="flex flex-col items-center mb-6">
        {/* Album Art */}
        <div className="relative mb-6">
          <div
            className={cn(
              'w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden',
              'shadow-2xl border border-white/10',
              'transition-transform duration-500',
              isPlaying && 'scale-[1.02]'
            )}
          >
            {nowPlaying?.song.art ? (
              <img
                src={nowPlaying.song.art}
                alt={nowPlaying.song.title}
                className="w-full h-full object-cover"
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
        <div className="text-center space-y-1 w-full max-w-sm">
          <h2 className="text-lg md:text-xl font-medium text-foreground truncate px-2">
            {nowPlaying?.song.title || 'En attente...'}
          </h2>
          <p className="text-sm text-muted-foreground truncate px-2">
            {nowPlaying?.song.artist || '—'}
          </p>
          {nowPlaying?.playlist && (
            <p className="text-xs text-muted-foreground/60">
              {nowPlaying.playlist.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 space-y-2">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{formatTime(elapsed)}</span>
          <span>{duration > 0 ? `-${formatTime(duration - elapsed)}` : '—:——'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={togglePlay}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-all',
            'shadow-lg shadow-primary/25'
          )}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mb-6 px-4">
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
          className="flex-1 accent-primary"
        />
        <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
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
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Précédemment</span>
          </div>
          <HistoryItem entry={np.song_history[0]} />
        </div>
      )}
    </div>
  );
}
