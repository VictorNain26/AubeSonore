import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import * as i18n from '@/paraglide/messages.js';
import { Rail } from '../atoms/Rail';
import { TrackRailItem } from '../molecules/TrackRailItem';
import { useRailEntry } from '../../lib/motion';

export interface RailEntry {
  id: number;
  title: string;
  artist: string;
  art?: string;
  isLiked: boolean;
  isLiking: boolean;
}

export interface RecentTracksRailProps {
  /** Morceaux récemment diffusés à afficher. */
  entries: RailEntry[];
  /** Chargement initial en cours (affiche des squelettes tant qu'il n'y a aucune entrée). */
  isLoading: boolean;
  /** L'historique renvoyé est partiel (affiche une mention explicative). */
  partial: boolean;
  /** Appelé avec l'id du morceau au clic favori. */
  onToggle: (id: number) => void;
  /** Appelé avec l'id du morceau au clic partager. */
  onShare: (id: number) => void;
}

/**
 * Section « Vient de passer » : piste horizontale des morceaux récents, avec états
 * chargement (squelettes), historique partiel et vide.
 */
export function RecentTracksRail({
  entries,
  isLoading,
  partial,
  onToggle,
  onShare,
}: RecentTracksRailProps) {
  const railEntry = useRailEntry();

  return (
    <section aria-label={i18n.recent_tracks_title()} className="min-w-0 border-t border-border">
      <div className="mx-auto w-full min-w-0 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-caption tracking-widest uppercase text-text-faint">
            {i18n.recent_tracks_title()}
          </h2>
          {partial ? (
            <p className="text-caption text-text-faint">{i18n.recent_tracks_partial()}</p>
          ) : null}
        </div>

        {isLoading && entries.length === 0 ? (
          <div className="flex gap-4 overflow-hidden pt-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                data-testid="recent-tracks-skeleton"
                className="flex w-72 shrink-0 items-center gap-3 py-3"
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
          <p className="text-caption text-text-faint pt-1.5">{i18n.recent_tracks_empty()}</p>
        ) : (
          <div className="pt-1.5 pb-1">
            <Rail ariaLabel={i18n.recent_tracks_title()}>
              <AnimatePresence initial={false}>
                {entries.map((entry) => (
                  <m.div key={entry.id} {...railEntry} className="shrink-0">
                    <TrackRailItem
                      title={entry.title}
                      artist={entry.artist}
                      {...(entry.art !== undefined ? { art: entry.art } : {})}
                      isLiked={entry.isLiked}
                      isLiking={entry.isLiking}
                      onToggle={() => onToggle(entry.id)}
                      onShare={() => onShare(entry.id)}
                    />
                  </m.div>
                ))}
              </AnimatePresence>
            </Rail>
          </div>
        )}
      </div>
    </section>
  );
}
