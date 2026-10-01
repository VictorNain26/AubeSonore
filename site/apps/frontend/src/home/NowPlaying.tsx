import { useShallow } from 'zustand/react/shallow';
import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNowPlayingStore } from '../lib/azuracast';
import { useTrackActions } from '../hooks/player/useTrackActions';
import { useArtistInfo } from '../hooks/useArtistInfo';
import { useArtistPanelStore } from '../stores/artistPanelStore';
import { Cover } from './Cover';
import { formatClock } from './time';
import { TEXT_ACTION } from './styles';
import * as m from '@/paraglide/messages.js';

export interface NowPlayingViewProps {
  track: {
    title: string;
    artist: string;
    art: string | undefined;
    playedAt: number;
  } | null;
  isOnline: boolean;
  /** Unique listeners; shown only from two upwards. */
  listeners: number | undefined;
  isKept: boolean;
  isKeeping: boolean;
  onToggleKeep: () => void;
  onShare: () => void;
  onOpenArtist: (() => void) | undefined;
}

export function NowPlayingView({
  track,
  isOnline,
  listeners,
  isKept,
  isKeeping,
  onToggleKeep,
  onShare,
  onOpenArtist,
}: NowPlayingViewProps) {
  if (!isOnline) {
    return (
      <p className="text-intro text-text-muted" aria-live="polite">
        {m.off_air()}
      </p>
    );
  }

  if (!track) {
    return (
      <div
        className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 md:flex md:flex-col md:items-start md:gap-3.5"
        aria-busy="true"
      >
        <div className="bg-surface-raised aspect-square w-24 rounded-sm md:w-72" />
        <div className="flex w-full flex-col gap-1">
          <div className="bg-surface-raised h-4 w-32 rounded-sm" />
          <div className="bg-surface-raised h-6 w-48 rounded-sm" />
          <div className="bg-surface-raised h-5 w-24 rounded-sm" />
          <div className="mt-1.5 h-11" />
        </div>
      </div>
    );
  }

  const label = m.now_on_air({ time: formatClock(track.playedAt) });

  return (
    <figure className="m-0 grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 md:flex md:flex-col md:items-start md:gap-3.5">
      <Cover
        src={track.art}
        alt={m.now_cover_alt({ title: track.title, artist: track.artist })}
        seed={`${track.artist}|${track.title}`}
        priority
        className="shadow-cover aspect-square w-24 md:w-72"
      />
      <figcaption className="flex min-w-0 flex-col gap-1">
        <span className="text-label text-text-muted font-mono uppercase">
          {label}
          {listeners !== undefined && listeners >= 2
            ? ` · ${m.now_listeners({ count: listeners })}`
            : null}
        </span>
        <span className="text-headline">{track.title}</span>
        <span className="text-sub text-text-muted">{track.artist}</span>
        <span className="mt-1.5 flex flex-wrap gap-x-5">
          <button
            type="button"
            onClick={onToggleKeep}
            disabled={isKeeping}
            aria-pressed={isKept}
            className={TEXT_ACTION}
          >
            <Heart
              className={cn('size-4', isKept && 'fill-current')}
              strokeWidth={1.6}
              aria-hidden="true"
            />
            {isKept ? m.track_kept() : m.track_keep()}
          </button>
          <button type="button" onClick={onShare} className={TEXT_ACTION}>
            <Share2 className="size-4" strokeWidth={1.6} aria-hidden="true" />
            {m.track_share()}
          </button>
          {onOpenArtist ? (
            <button type="button" onClick={onOpenArtist} className={TEXT_ACTION}>
              {m.track_artist()}
            </button>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}

export function NowPlaying() {
  const { title, artist, art, playedAt, isOnline, listeners } = useNowPlayingStore(
    useShallow((s) => ({
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
      art: s.data?.now_playing?.song.art,
      playedAt: s.data?.now_playing?.played_at,
      isOnline: s.data?.is_online ?? true,
      listeners: s.data?.listeners?.unique,
    }))
  );
  const { isLiked, isLiking, handleToggleLike, handleShare } = useTrackActions();
  const { data: artistInfo } = useArtistInfo(artist);
  const openArtistPanel = useArtistPanelStore((s) => s.open);

  return (
    <NowPlayingView
      track={title && artist && playedAt !== undefined ? { title, artist, art, playedAt } : null}
      isOnline={isOnline}
      listeners={listeners}
      isKept={isLiked}
      isKeeping={isLiking}
      onToggleKeep={handleToggleLike}
      onShare={handleShare}
      onOpenArtist={artistInfo?.bio && artist ? () => openArtistPanel(artist) : undefined}
    />
  );
}
