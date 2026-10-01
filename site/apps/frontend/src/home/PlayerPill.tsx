import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Airplay, Volume2, VolumeX } from 'lucide-react';
import { useNowPlayingStore } from '../lib/azuracast';
import { usePlayer } from '../lib/player';
import { useAirPlayStore } from '../stores/airplayStore';
import { Slider } from '../design/atoms/Slider';
import { Cover } from './Cover';
import * as m from '@/paraglide/messages.js';

const ICON_BUTTON =
  'ease-out-quart focus-visible:outline-on-accent flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2';

export interface PlayerPillViewProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  title: string | undefined;
  artist: string | undefined;
  art: string | undefined;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  airPlay: { isActive: boolean; onOpen: () => void } | null;
}

/**
 * The live player. A pill in the header on wide screens; on phones it is pinned
 * to the bottom of the screen so the stream stays one tap away while scrolling.
 */
export function PlayerPillView({
  isPlaying,
  onTogglePlay,
  title,
  artist,
  art,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  airPlay,
}: PlayerPillViewProps) {
  return (
    <section
      aria-label={m.player_label()}
      className="bg-accent text-on-accent shadow-bar fixed inset-x-3 bottom-4 z-40 flex min-w-0 items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 md:static md:max-w-xl md:shadow-none"
    >
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? m.player_pause_aria() : m.player_listen_aria()}
        aria-pressed={isPlaying}
        className="bg-surface text-text ease-out-quart focus-visible:outline-on-accent flex size-12 shrink-0 items-center justify-center rounded-full transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95 md:size-11"
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
          {isPlaying ? (
            <>
              <rect x="4.5" y="3" width="3.6" height="14" rx="1" fill="currentColor" />
              <rect x="11.9" y="3" width="3.6" height="14" rx="1" fill="currentColor" />
            </>
          ) : (
            <path
              d="M6 3.5v13a.6.6 0 0 0 .9.5l10.4-6.5a.6.6 0 0 0 0-1L6.9 3a.6.6 0 0 0-.9.5Z"
              fill="currentColor"
            />
          )}
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center">
        <span className="text-ui font-semibold whitespace-nowrap md:px-2">
          {isPlaying ? m.player_listening() : m.player_listen()}
        </span>
        {title && artist ? (
          <>
            <span aria-hidden="true" className="bg-on-accent/25 mx-2 hidden h-5 w-px md:block" />
            <Cover
              src={art}
              alt=""
              seed={`${artist}|${title}`}
              className="mx-2 hidden size-8 shrink-0 md:block"
            />
            <span className="text-caption md:text-ui truncate md:ml-1 md:font-normal">
              <span className="text-on-accent-muted md:text-on-accent">{title}</span>
              <span className="text-on-accent-muted"> — {artist}</span>
            </span>
          </>
        ) : null}
      </div>

      <div className="hidden items-center pointer-fine:flex">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? m.volume_unmute() : m.volume_mute()}
          className={ICON_BUTTON}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="size-4" aria-hidden="true" />
          ) : (
            <Volume2 className="size-4" aria-hidden="true" />
          )}
        </button>
        <div className="w-20">
          <Slider
            label={m.volume_slider()}
            value={isMuted ? 0 : volume}
            onValueChange={onVolumeChange}
            tone="accent"
          />
        </div>
      </div>

      {airPlay ? (
        <button
          type="button"
          onClick={airPlay.onOpen}
          aria-label={airPlay.isActive ? m.airplay_active() : m.airplay_open()}
          aria-pressed={airPlay.isActive}
          className={ICON_BUTTON}
        >
          <Airplay className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

export function PlayerPill() {
  const { title, artist, art } = useNowPlayingStore(
    useShallow((s) => ({
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
      art: s.data?.now_playing?.song.art,
    }))
  );
  const { isPlaying, play, stop, volume, isMuted, setVolume, toggleMute, restoreVolume } =
    usePlayer(
      useShallow((s) => ({
        isPlaying: s.isPlaying,
        play: s.play,
        stop: s.stop,
        volume: s.volume,
        isMuted: s.isMuted,
        setVolume: s.setVolume,
        toggleMute: s.toggleMute,
        restoreVolume: s.restoreVolume,
      }))
    );
  const { airPlayAvailable, airPlayActive, initAirPlay, openAirPlay } = useAirPlayStore(
    useShallow((s) => ({
      airPlayAvailable: s.available,
      airPlayActive: s.isActive,
      initAirPlay: s.initialize,
      openAirPlay: s.openPicker,
    }))
  );

  useEffect(() => {
    restoreVolume();
    initAirPlay();
  }, [restoreVolume, initAirPlay]);

  return (
    <PlayerPillView
      isPlaying={isPlaying}
      onTogglePlay={() => (isPlaying ? stop() : void play())}
      title={title}
      artist={artist}
      art={art}
      volume={volume}
      isMuted={isMuted}
      onVolumeChange={setVolume}
      onToggleMute={toggleMute}
      airPlay={airPlayAvailable ? { isActive: airPlayActive, onOpen: openAirPlay } : null}
    />
  );
}
