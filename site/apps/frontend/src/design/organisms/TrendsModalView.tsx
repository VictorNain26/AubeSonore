import { useState } from 'react';
import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';
import { Thumbnail } from '../atoms/Thumbnail';
import { Button } from '../atoms/Button';
import * as m from '@/paraglide/messages.js';

export interface TrendEntryViewModel {
  title: string;
  artist: string;
  artworkUrl?: string;
  likes: number;
  /** Déjà présent dans la bibliothèque de l'auditeur (cœur plein). */
  isLiked: boolean;
}

export interface TrendsModalViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: TrendEntryViewModel[];
  allTime: TrendEntryViewModel[];
  isLoading: boolean;
  hasError: boolean;
  onLikeTrack: (entry: TrendEntryViewModel) => void;
  onShareTrack: (entry: TrendEntryViewModel) => void;
}

type TabId = 'week' | 'allTime';

const TABS: { id: TabId; label: () => string }[] = [
  { id: 'week', label: m.trends_tab_week },
  { id: 'allTime', label: m.trends_tab_all_time },
];

// En dessous de 3 entrées, le classement de la semaine ressemble plus à un
// hasard qu'à une tendance : on affiche l'état vide à la place.
const WEEK_MIN_ENTRIES = 3;

function likesCaption(likes: number): string {
  return likes === 1 ? m.trends_likes_one() : m.trends_likes_other({ count: likes });
}

/**
 * Corps de la modale « Tendances » : deux onglets (semaine / depuis le début)
 * et le classement des morceaux les plus aimés par la communauté, avec aimer
 * et partager sur chaque ligne. Purement présentationnel — le conteneur
 * `TrendsModal` gère le fetch, l'état de la bibliothèque et les actions.
 */
export function TrendsModalView({
  open,
  onOpenChange,
  week,
  allTime,
  isLoading,
  hasError,
  onLikeTrack,
  onShareTrack,
}: TrendsModalViewProps) {
  const [tab, setTab] = useState<TabId>('week');
  const entries = tab === 'week' ? week : allTime;
  const showWeekEmpty = tab === 'week' && week.length < WEEK_MIN_ENTRIES;
  const showAllTimeEmpty = tab === 'allTime' && allTime.length === 0;

  return (
    <Modal title={m.trends_modal_title()} open={open} onOpenChange={onOpenChange} size="lg">
      <p className="text-caption text-text-faint -mt-3">{m.trends_subtitle()}</p>

      <div
        role="tablist"
        aria-label={m.trends_tablist_aria()}
        className="bg-surface flex gap-1 rounded-full p-1"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'text-body ease-out-quart focus-visible:outline-accent h-11 flex-1 rounded-full font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2',
              tab === id ? 'bg-surface-raised text-text' : 'text-text-muted hover:text-text'
            )}
          >
            {label()}
          </button>
        ))}
      </div>

      <div className="max-h-[70dvh] min-h-0 scrollbar-none overflow-y-auto">
        {isLoading ? (
          <div className="divide-border divide-y" aria-label={m.loading()}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="bg-surface size-10 animate-pulse rounded-sm" />
                <div className="flex-1 space-y-2">
                  <div className="bg-surface h-3 w-2/3 animate-pulse rounded-sm" />
                  <div className="bg-surface h-2.5 w-1/3 animate-pulse rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : hasError ? (
          <p className="text-body text-text-muted py-10 text-center">{m.trends_error()}</p>
        ) : showWeekEmpty || showAllTimeEmpty ? (
          <p className="text-body text-text-muted py-10 text-center">
            {showWeekEmpty ? m.trends_week_empty() : m.trends_all_time_empty()}
          </p>
        ) : (
          <div className="divide-border divide-y" role="list">
            {entries.map((entry, index) => (
              <div
                key={`${entry.artist}|${entry.title}`}
                role="listitem"
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2"
              >
                <span className="text-caption text-text-faint w-6 shrink-0 text-center">
                  {index + 1}
                </span>
                <Thumbnail
                  {...(entry.artworkUrl ? { src: entry.artworkUrl } : {})}
                  alt={entry.title}
                  seed={`${entry.artist}|${entry.title}`}
                  className="bg-surface"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body text-text truncate">{entry.title}</p>
                  <p className="text-caption text-text-muted truncate">{entry.artist}</p>
                  <p className="text-caption text-text-faint">{likesCaption(entry.likes)}</p>
                </div>
                <div data-testid="row-actions" className="flex items-center gap-1">
                  <Button
                    variant="icon"
                    onClick={() => onLikeTrack(entry)}
                    aria-label={
                      entry.isLiked
                        ? m.trends_unlike_aria({ title: entry.title })
                        : m.trends_like_aria({ title: entry.title })
                    }
                    title={entry.isLiked ? m.library_remove() : m.trends_like_action()}
                    className={cn(
                      entry.isLiked
                        ? 'text-accent hover:text-accent'
                        : 'text-text-faint hover:bg-surface hover:text-text'
                    )}
                  >
                    <Heart className={cn('size-4', entry.isLiked && 'fill-current')} />
                  </Button>
                  <Button
                    variant="icon"
                    onClick={() => onShareTrack(entry)}
                    aria-label={m.trends_share_aria({ title: entry.title })}
                    title={m.track_share()}
                    className="text-text-faint hover:bg-surface hover:text-text"
                  >
                    <Share2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
