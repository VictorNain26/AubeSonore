import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Popover } from '@base-ui/react/popover';
import { Airplay, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KeepHeart } from './KeepHeart';
import { useNowPlayingStore } from '../lib/azuracast';
import { usePlayer } from '../lib/player';
import { useAirPlayStore } from '../stores/airplayStore';
import { useTrackActions } from '../hooks/player/useTrackActions';
import { Slider } from '../design/atoms/Slider';
import { Cover } from './Cover';
import { formatClock } from './time';
import {
  ListenDisc,
  listenAria,
  listenLabel,
  listenState,
  useHeroListenVisible,
  type ListenState,
} from './listen';
import * as m from '@/paraglide/messages.js';

const ICON_BUTTON =
  'ease-out-quart focus-visible:outline-on-accent flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2';

export interface PlayerBarViewProps {
  /** Hidden while the hero's own Écouter button is on screen. */
  isHidden: boolean;
  listen: ListenState;
  onToggleListen: () => void;
  track: { title: string; artist: string; art: string | undefined; playedAt: number } | null;
  isKept: boolean;
  onToggleKeep: () => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  airPlay: { isActive: boolean; onOpen: () => void } | null;
}

function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: Pick<PlayerBarViewProps, 'volume' | 'isMuted' | 'onVolumeChange' | 'onToggleMute'>) {
  const silent = isMuted || volume === 0;
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={m.volume_slider()}
        className={cn(ICON_BUTTON, 'hidden pointer-fine:flex')}
      >
        {silent ? (
          <VolumeX className="size-4" aria-hidden="true" />
        ) : (
          <Volume2 className="size-4" aria-hidden="true" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={12} className="z-50">
          <Popover.Popup className="bg-accent text-on-accent shadow-bar ease-out-quart flex origin-(--transform-origin) flex-col items-center gap-1 rounded-full px-1 py-3 transition-[opacity,scale] duration-150 focus:outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Slider
              label={m.volume_slider()}
              value={isMuted ? 0 : volume}
              onValueChange={onVolumeChange}
              orientation="vertical"
              step={0.05}
              tone="accent"
            />
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={silent ? m.volume_unmute() : m.volume_mute()}
              className={ICON_BUTTON}
            >
              {silent ? (
                <VolumeX className="size-4" aria-hidden="true" />
              ) : (
                <Volume2 className="size-4" aria-hidden="true" />
              )}
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * The live player, one bar for every screen: pinned to the bottom, it slides in
 * once the hero's Écouter button has scrolled away, so there is never two of
 * them on screen. Volume opens on demand (mouse only: phones use their buttons).
 */
export function PlayerBarView({
  isHidden,
  listen,
  onToggleListen,
  track,
  isKept,
  onToggleKeep,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  airPlay,
}: PlayerBarViewProps) {
  const line1 =
    listen === 'playing' && track
      ? m.now_on_air({ time: formatClock(track.playedAt) })
      : listenLabel(listen);
  const [hasFocus, setHasFocus] = useState(false);
  // Never hide the bar while it holds the keyboard focus (WCAG 2.4.11).
  const hidden = isHidden && !hasFocus;

  return (
    <section
      aria-label={m.player_label()}
      inert={hidden}
      onFocus={() => setHasFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHasFocus(false);
      }}
      className={cn(
        'bg-accent text-on-accent shadow-bar bottom-safe max-w-bar fixed inset-x-3 z-40 mx-auto flex items-center gap-3 rounded-full py-1.5 pr-3 pl-1.5',
        'ease-out-quart transition-[translate,opacity] duration-300',
        hidden && 'pointer-events-none translate-y-24 opacity-0'
      )}
    >
      <button
        type="button"
        onClick={onToggleListen}
        aria-label={listenAria(listen)}
        aria-busy={listen === 'connecting'}
        className="ease-out-quart focus-visible:outline-on-accent shrink-0 rounded-full transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95"
      >
        <ListenDisc state={listen} className="size-12" />
      </button>

      {track ? (
        <Cover
          src={track.art}
          alt=""
          seed={`${track.artist}|${track.title}`}
          className="hidden size-10 shrink-0 md:block"
        />
      ) : null}

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-ui font-semibold">{line1}</span>
        <span className="text-caption text-on-accent-muted truncate">
          {track ? `${track.title} — ${track.artist}` : ' '}
        </span>
      </span>

      {track ? (
        <button
          type="button"
          onClick={onToggleKeep}
          aria-pressed={isKept}
          aria-label={m.track_keep_aria({ title: track.title })}
          className={ICON_BUTTON}
        >
          <KeepHeart isKept={isKept} className="size-4" />
        </button>
      ) : null}

      <VolumeControl
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
      />

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

export function PlayerBar() {
  const { title, artist, art, playedAt } = useNowPlayingStore(
    useShallow((s) => ({
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
      art: s.data?.now_playing?.song.art,
      playedAt: s.data?.now_playing?.played_at,
    }))
  );
  const player = usePlayer(
    useShallow((s) => ({
      isPlaying: s.isPlaying,
      isConnecting: s.isConnecting,
      toggle: s.toggle,
      volume: s.volume,
      isMuted: s.isMuted,
      setVolume: s.setVolume,
      toggleMute: s.toggleMute,
      restoreVolume: s.restoreVolume,
    }))
  );
  const airPlay = useAirPlayStore(
    useShallow((s) => ({
      available: s.available,
      isActive: s.isActive,
      initialize: s.initialize,
      openPicker: s.openPicker,
    }))
  );
  const { isLiked, handleToggleLike } = useTrackActions();
  const heroListenVisible = useHeroListenVisible((s) => s.visible);
  const { restoreVolume } = player;
  const { initialize } = airPlay;

  useEffect(() => {
    restoreVolume();
    initialize();
  }, [restoreVolume, initialize]);

  return (
    <PlayerBarView
      isHidden={heroListenVisible}
      listen={listenState(player.isPlaying, player.isConnecting)}
      onToggleListen={player.toggle}
      track={title && artist && playedAt !== undefined ? { title, artist, art, playedAt } : null}
      isKept={isLiked}
      onToggleKeep={handleToggleLike}
      volume={player.volume}
      isMuted={player.isMuted}
      onVolumeChange={player.setVolume}
      onToggleMute={player.toggleMute}
      airPlay={
        airPlay.available ? { isActive: airPlay.isActive, onOpen: airPlay.openPicker } : null
      }
    />
  );
}
