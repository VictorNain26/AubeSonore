import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNowPlayingStore } from '../lib/azuracast';
import { useTodayHistory } from '../hooks/useTodayHistory';
import { useLikeAction } from '../hooks/player/useLikeAction';
import { useLikedTracksStore, isTrackLiked } from '../stores/likedTracksStore';
import { formatClock } from './time';
import { TEXT_ACTION } from './styles';
import * as m from '@/paraglide/messages.js';

const PAGE = 10;

export interface ThreadRow {
  id: number;
  playedAt: number;
  title: string;
  artist: string;
  isNow: boolean;
  isKept: boolean;
  isKeeping: boolean;
}

export interface SinceDawnViewProps {
  rows: ThreadRow[];
  status: 'loading' | 'error' | 'ready';
  onToggleKeep: (id: number) => void;
}

export function SinceDawnView({ rows, status, onToggleKeep }: SinceDawnViewProps) {
  const [visible, setVisible] = useState(PAGE);
  const shown = rows.slice(0, visible);

  return (
    <section
      aria-labelledby="since-dawn-title"
      className="reveal grid gap-6 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-16"
    >
      <div className="flex flex-col gap-2 self-start md:sticky md:top-10 md:gap-3">
        <h2 id="since-dawn-title" className="text-section m-0">
          {m.since_dawn_title()}
        </h2>
        <p className="text-text-muted max-w-blurb m-0">{m.since_dawn_body()}</p>
      </div>

      <div className="flex flex-col">
        {status === 'loading' && rows.length === 0 ? (
          <ol aria-busy="true" className="border-accent m-0 list-none border-t p-0">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="border-border flex min-h-16 items-center border-b">
                <span className="bg-surface-raised h-4 w-2/3 rounded-sm" />
              </li>
            ))}
          </ol>
        ) : rows.length === 0 ? (
          <p className="text-text-muted border-accent m-0 border-t pt-4">
            {status === 'error' ? m.since_dawn_error() : m.since_dawn_empty()}
          </p>
        ) : (
          <ol className="border-accent m-0 list-none border-t p-0">
            {shown.map((row) => (
              <li
                key={row.id}
                className="border-border ease-out-soft hover:bg-accent/3 grid min-h-16 grid-cols-[4.25rem_minmax(0,1fr)_2.75rem] items-center gap-x-3 border-b transition-[background-color,translate] duration-300 motion-safe:hover:translate-x-1.5 md:min-h-15 md:grid-cols-[7rem_minmax(0,1.2fr)_minmax(0,1fr)_2.75rem] md:gap-x-6 md:px-1"
              >
                <span
                  className={cn(
                    'text-ui font-mono whitespace-nowrap tabular-nums',
                    row.isNow ? 'text-text' : 'text-text-muted font-normal'
                  )}
                >
                  {row.isNow ? '● ' : ''}
                  {formatClock(row.playedAt)}
                </span>
                <span className="flex min-w-0 flex-col md:contents">
                  <span className="text-row truncate">{row.title}</span>
                  <span className="text-sub text-text-muted truncate">{row.artist}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onToggleKeep(row.id)}
                  disabled={row.isKeeping}
                  aria-pressed={row.isKept}
                  aria-label={
                    row.isKept
                      ? m.track_unkeep_aria({ title: row.title })
                      : m.track_keep_aria({ title: row.title })
                  }
                  className="group ease-out-quart focus-visible:outline-accent flex size-11 items-center justify-center rounded-full focus-visible:outline-2 disabled:opacity-50"
                >
                  <Heart
                    className={cn(
                      'ease-spring size-4.5 transition-transform duration-250 group-hover:scale-118',
                      row.isKept && 'fill-current'
                    )}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ol>
        )}

        {rows.length > visible ? (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className={cn(TEXT_ACTION, 'mt-5 self-start md:ml-34')}
          >
            {m.since_dawn_more()}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function SinceDawn() {
  const { entries, isLoading, error } = useTodayHistory();
  const nowId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const tracks = useLikedTracksStore((s) => s.tracks);
  const { likingTrackId, toggleLike } = useLikeAction();

  const rows: ThreadRow[] = entries.map((e) => ({
    id: e.sh_id,
    playedAt: e.played_at,
    title: e.song.title,
    artist: e.song.artist,
    isNow: e.sh_id === nowId,
    isKept: isTrackLiked(tracks, e.song.title, e.song.artist),
    isKeeping: likingTrackId === `${e.song.title}-${e.song.artist}`,
  }));

  return (
    <SinceDawnView
      rows={rows}
      status={isLoading ? 'loading' : error ? 'error' : 'ready'}
      onToggleKeep={(id) => {
        const entry = entries.find((e) => e.sh_id === id);
        if (entry) void toggleLike(entry.song.title, entry.song.artist, entry.song.art);
      }}
    />
  );
}
