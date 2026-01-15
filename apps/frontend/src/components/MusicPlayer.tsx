import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Radio } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { PlayerService, usePlayerStore } from '../lib/playerService';
import { AZURACAST_URL } from '../utils/config';

interface Station {
  name: string;
  listen_url?: string;
}

interface Song {
  title: string;
  artist: string;
  art?: string;
  album?: string;
}

interface NowPlayingData {
  station?: Station;
  now_playing?: {
    song?: Song;
    elapsed?: number;
    duration?: number;
  };
}

interface SSEPayload {
  data?: {
    current_time?: number;
    np?: NowPlayingData;
  };
}

interface SSEMessage {
  connect?: {
    data?: SSEPayload[];
    subs?: Record<string, {
      publications?: SSEPayload[];
    }>;
  };
  pub?: SSEPayload;
}

const MusicVisualizer: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => (
  <div className="flex items-end justify-center gap-1 h-12">
    {[...Array(7)].map((_, i) => (
      <motion.div
        key={i}
        className={cn(
          'w-1.5 bg-gradient-to-t from-primary via-accent to-pink-400 rounded-full',
          isPlaying ? 'music-bar' : 'h-1',
        )}
        style={{
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))}
  </div>
);

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
    if (vol > 0) {
      setPreviousVolume(vol / 100);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (elapsed / duration) * 100 : 0;

  // SSE Connection for live updates
  useEffect(() => {
    const connectToSSE = (): void => {
      try {
        eventSourceRef.current = new EventSource(`${AZURACAST_URL}/api/live/nowplaying/sse`);

        eventSourceRef.current.onmessage = (event): void => {
          try {
            const data: SSEMessage = JSON.parse(event.data);

            let nowPlayingData: NowPlayingData | null = null;

            if (data.connect?.data?.[0]?.data?.np) {
              nowPlayingData = data.connect.data[0].data.np;
            } else if (data.pub?.data?.np) {
              nowPlayingData = data.pub.data.np;
            }

            if (nowPlayingData) {
              setNowPlaying(nowPlayingData);

              if (nowPlayingData.now_playing?.elapsed !== undefined) {
                setElapsed(nowPlayingData.now_playing.elapsed);
              }
              if (nowPlayingData.now_playing?.duration !== undefined) {
                setDuration(nowPlayingData.now_playing.duration);
              }
            }

          } catch (err) {
            // Silent fail for parsing errors
          }
        };

        eventSourceRef.current.onerror = (): void => {
          eventSourceRef.current?.close();
          setTimeout(connectToSSE, 3000);
        };
      } catch (err) {
        setTimeout(connectToSSE, 5000);
      }
    };

    connectToSSE();

    return (): void => {
      eventSourceRef.current?.close();
    };
  }, []);

  // Progress timer
  useEffect(() => {
    if (isPlaying && duration > 0) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          return next <= duration ? next : duration;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return (): void => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, duration]);

  const currentSong = nowPlaying?.now_playing?.song;
  const stationName = nowPlaying?.station?.name ?? 'OurMusic Radio';

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Main Player Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
      >
        {/* Background Art with Blur */}
        <AnimatePresence mode="wait">
          {currentSong?.art && (
            <motion.div
              key={currentSong.art}
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 z-0"
            >
              <img
                src={currentSong.art}
                alt=""
                className="w-full h-full object-cover opacity-30 blur-3xl scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col items-center gap-8">
            {/* Album Art */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative"
            >
              <div className={cn(
                'w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden shadow-2xl',
                'ring-4 ring-white/10 ring-offset-4 ring-offset-transparent',
                isPlaying && 'ring-primary/50'
              )}>
                <AnimatePresence mode="wait">
                  {currentSong?.art ? (
                    <motion.img
                      key={currentSong.art}
                      src={currentSong.art}
                      alt="Album artwork"
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.5 }}
                    />
                  ) : (
                    <motion.div
                      className="w-full h-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Radio className="w-20 h-20 text-white/80" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Live indicator badge */}
              <AnimatePresence>
                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute -top-3 -right-3 bg-gradient-to-r from-primary to-accent rounded-full px-4 py-1.5 shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Live</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Track Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center space-y-2 w-full"
            >
              {/* Station Name */}
              <p className="text-sm font-medium text-accent uppercase tracking-widest">
                {stationName}
              </p>

              {/* Track Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-2">
                {currentSong?.title ?? 'En attente...'}
              </h1>

              {/* Artist */}
              <p className="text-lg text-white/60">
                {currentSong?.artist ?? 'Connexion en cours'}
              </p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full space-y-2"
            >
              <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5, ease: 'linear' }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/40 font-medium">
                <span>{formatTime(elapsed)}</span>
                <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
              </div>
            </motion.div>

            {/* Music Visualizer */}
            <MusicVisualizer isPlaying={isPlaying} />

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Play Button */}
              <Button
                variant="gradient"
                onClick={togglePlay}
                className={cn(
                  'w-20 h-20 rounded-full shadow-2xl transition-all duration-300',
                  'hover:scale-105 active:scale-95',
                  isPlaying && 'shadow-primary/50'
                )}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>

              {/* Volume Control */}
              <div className="flex items-center gap-4 w-full max-w-xs">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white/60 hover:text-white shrink-0"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>

                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(volume * 100)}
                    onChange={handleVolumeChange}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-gradient-to-r
                      [&::-webkit-slider-thumb]:from-primary
                      [&::-webkit-slider-thumb]:to-accent
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-110"
                  />
                </div>

                <span className="text-xs text-white/40 w-8 text-right font-medium">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MusicPlayer;
