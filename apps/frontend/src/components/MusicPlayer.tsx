import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Share2, MoreHorizontal, Radio } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import TrackLikeButton from './TrackLikeButton';
import { PlayerService, usePlayerStore } from '../lib/playerService';
import { AZURACAST_URL } from '../utils/config';
import { toast } from 'react-hot-toast';

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
  <div className="flex items-end gap-1 h-8">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        className={cn(
          'w-1 bg-gradient-to-t from-primary to-accent rounded-full',
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

  const handleVolumeChange = (newVolume: number[]): void => {
    const vol = newVolume[0] ?? 0;
    setVolume(vol);
    setIsMuted(vol === 0);
    if (vol > 0) {
      setPreviousVolume(vol);
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
            // eslint-disable-next-line no-console
            console.warn('Erreur parsing SSE:', err);
          }
        };

        eventSourceRef.current.onerror = (): void => {
          // eslint-disable-next-line no-console
          console.warn('Connexion SSE fermée, reconnexion...');
          eventSourceRef.current?.close();
          setTimeout(connectToSSE, 3000);
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Erreur SSE:', err);
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
    <div className="w-full max-w-4xl mx-auto">
      {/* Main Player Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={
          'relative overflow-hidden rounded-3xl bg-gradient-to-br from-player-bg to-player-card ' +
          'border border-white/10 shadow-2xl'
        }
      >
        {/* Background Art with Blur */}
        <AnimatePresence mode="wait">
          {currentSong?.art && (
            <motion.div
              key={currentSong.art}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 z-0"
            >
              <img
                src={currentSong.art}
                alt="Album art"
                className="w-full h-full object-cover opacity-20 blur-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 p-8 lg:p-12">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Album Art */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative group"
            >
              <div className="w-40 h-40 lg:w-48 lg:h-48 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20">
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
                      className={
                        'w-full h-full bg-gradient-to-br from-primary/50 to-accent/50 ' +
                        'flex items-center justify-center'
                      }
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Radio className="w-16 h-16 text-white/80" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Floating play indicator */}
              <AnimatePresence>
                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className={
                      'absolute -top-2 -right-2 bg-gradient-to-r from-primary to-accent ' +
                      'rounded-full p-2 shadow-lg neon-glow'
                    }
                  >
                    <Radio className="w-4 h-4 text-white pulse-live" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Track Info & Controls */}
            <div className="flex-1 text-center lg:text-left space-y-6">
              {/* Station & Live Indicator */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center lg:justify-start gap-2"
              >
                <div className="w-2 h-2 bg-accent rounded-full pulse-live" />
                <span className="text-sm font-medium text-accent uppercase tracking-wider">
                  LIVE • {stationName}
                </span>
              </motion.div>

              {/* Track Title */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <h1 className="text-2xl lg:text-4xl font-bold text-white leading-tight">
                  {currentSong?.title ?? 'En attente...'}
                </h1>
                <p className="text-lg lg:text-xl text-white/70">
                  {currentSong?.artist ?? 'Aucun artiste'}
                </p>
                {currentSong?.album && (
                  <p className="text-sm text-white/50">
                    {currentSong.album}
                  </p>
                )}
              </motion.div>

              {/* Progress Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <div className="relative h-2 bg-progress-bg rounded-full overflow-hidden">
                  <motion.div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/50">
                  <span>{formatTime(elapsed)}</span>
                  <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
                </div>
              </motion.div>

              {/* Controls */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center lg:justify-start gap-4"
              >
                {/* Play/Pause Button */}
                <Button
                  variant="gradient"
                  size="xl"
                  onClick={togglePlay}
                  className="rounded-full w-16 h-16 shadow-2xl hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </Button>

                {/* Music Visualizer */}
                <MusicVisualizer isPlaying={isPlaying} />

                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="text-white/70 hover:text-white"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </Button>

                  <div className="w-20 lg:w-32">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => handleVolumeChange([parseInt(e.target.value)])}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-auto">
                  {currentSong && (
                    <TrackLikeButton
                      track={{
                        title: currentSong.title,
                        artist: currentSong.artist,
                        ...(currentSong.art && { art: currentSong.art }),
                      }}
                    />
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/70 hover:text-white"
                    onClick={() => toast.success('Fonctionnalité bientôt disponible')}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/70 hover:text-white"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MusicPlayer;
