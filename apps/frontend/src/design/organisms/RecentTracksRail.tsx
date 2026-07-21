import { Rail } from '../atoms/Rail';
import { TrackRailItem } from '../molecules/TrackRailItem';

export interface RailEntry {
  id: number;
  title: string;
  artist: string;
  art?: string;
  time: string;
  isLiked: boolean;
  isLiking: boolean;
}

export interface RecentTracksRailProps {
  entries: RailEntry[];
  isLoading: boolean;
  partial: boolean;
  onToggle: (id: number) => void;
  onShare: (id: number) => void;
}

export function RecentTracksRail({
  entries,
  isLoading,
  partial,
  onToggle,
  onShare,
}: RecentTracksRailProps) {
  return (
    <section aria-label="Vient de passer" className="min-w-0 border-t border-border">
      <div className="mx-auto w-full min-w-0 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-caption tracking-widest uppercase text-text-faint">
            Vient de passer
          </h2>
          {partial ? <p className="text-caption text-text-faint">Historique partiel.</p> : null}
        </div>

        {isLoading && entries.length === 0 ? (
          <div className="flex gap-4 overflow-hidden pt-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                data-testid="recent-tracks-skeleton"
                className="flex w-64 shrink-0 items-center gap-3 py-3"
              >
                <div className="size-12 rounded-sm animate-pulse bg-surface-raised" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="h-3.5 w-28 rounded-sm animate-pulse bg-surface-raised" />
                  <div className="h-3 w-16 rounded-sm animate-pulse bg-surface-raised" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-caption text-text-faint pt-1.5">Aucun morceau pour l&apos;instant.</p>
        ) : (
          <div className="pt-1.5 pb-1">
            <Rail ariaLabel="Vient de passer">
              {entries.map((entry) => (
                <TrackRailItem
                  key={entry.id}
                  title={entry.title}
                  artist={entry.artist}
                  {...(entry.art !== undefined ? { art: entry.art } : {})}
                  time={entry.time}
                  isLiked={entry.isLiked}
                  isLiking={entry.isLiking}
                  onToggle={() => onToggle(entry.id)}
                  onShare={() => onShare(entry.id)}
                />
              ))}
            </Rail>
          </div>
        )}
      </div>
    </section>
  );
}
