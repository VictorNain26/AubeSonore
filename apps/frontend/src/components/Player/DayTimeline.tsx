import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDayHistory } from '../../hooks/useDayHistory';
import { groupByMoment, type MomentGroup } from '../../lib/dayTimeline';
import { MOMENT_LABELS, MOMENT_BOUNDS, MOMENT_SHARE_PHRASES, getMoment } from '../../lib/moments';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { shareTrack } from '../../lib/shareTrack';
import { HistoryItem } from './HistoryItem';
import type { SongEntry } from '../../lib/azuracast';

const VISIBLE_GROUPS = 2;

export function DayTimeline() {
  const { entries, isLoading, error } = useDayHistory();
  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();
  const [isExpanded, setIsExpanded] = useState(false);

  const groups = useMemo(() => groupByMoment(entries), [entries]);

  useEffect(() => {
    if (isExpanded) window.dispatchEvent(new CustomEvent('aubesonore:timeline-expanded'));
  }, [isExpanded]);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleShare = useCallback(
    (entry: SongEntry) => {
      const likedTrack = tracks.find(
        (t) =>
          t.title.toLowerCase() === entry.song.title.toLowerCase() &&
          t.artist.toLowerCase() === entry.song.artist.toLowerCase()
      );
      const url = getTrackShareUrl(
        likedTrack ?? { title: entry.song.title, artist: entry.song.artist },
        preferences?.preferredPlatform
      );
      const moment = getMoment(new Date(entry.played_at * 1000));
      void shareTrack({
        title: entry.song.title,
        artist: entry.song.artist,
        url,
        momentLabel: MOMENT_SHARE_PHRASES[moment],
      }).then((result) => {
        if (result === 'copied') toast('Lien copié');
      });
    },
    [tracks, preferences]
  );

  if (isLoading && entries.length === 0) {
    return (
      <div className="border-t border-foreground/10 pt-4 space-y-3">
        <div className="h-4 w-32 rounded skeleton" />
        <div className="h-14 w-full rounded skeleton" />
        <div className="h-14 w-full rounded skeleton" />
        <div className="h-14 w-full rounded skeleton" />
      </div>
    );
  }

  if (groups.length === 0) return null;

  const visibleGroups = isExpanded ? groups : groups.slice(0, VISIBLE_GROUPS);
  const hiddenCount = groups.length - visibleGroups.length;

  return (
    <div className="border-t border-foreground/10 pt-4">
      {error && (
        <p className="text-xs text-foreground/30 mb-2">
          Historique partiel — actualisation impossible pour le moment.
        </p>
      )}
      {visibleGroups.map((group) => (
        <TimelineSection
          key={group.moment}
          group={group}
          isLikedTrack={(entry) => isTrackLiked(tracks, entry.song.title, entry.song.artist)}
          likingTrackId={likingTrackId}
          onToggle={(entry) => {
            void toggleLike(entry.song.title, entry.song.artist, entry.song.art);
          }}
          onShare={handleShare}
        />
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={handleExpand}
          className={cn(
            'mt-2 flex items-center gap-1.5 text-xs text-foreground/40',
            'hover:text-foreground/70 transition-colors duration-200 cursor-pointer'
          )}
        >
          <ChevronUp className="w-3.5 h-3.5" />
          Remonter la journée
        </button>
      )}
    </div>
  );
}

interface TimelineSectionProps {
  group: MomentGroup;
  isLikedTrack: (entry: SongEntry) => boolean;
  likingTrackId: string | null;
  onToggle: (entry: SongEntry) => void;
  onShare: (entry: SongEntry) => void;
}

function TimelineSection({
  group,
  isLikedTrack,
  likingTrackId,
  onToggle,
  onShare,
}: TimelineSectionProps) {
  const bounds = MOMENT_BOUNDS[group.moment];

  return (
    <section data-moment-section={group.moment} className="mb-4">
      <p className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm font-display text-xs tracking-widest uppercase text-foreground/50 py-2">
        {MOMENT_LABELS[group.moment]} — {bounds.start}h à {bounds.end}h
      </p>
      <div role="list">
        {group.entries.map((entry, index) => (
          <motion.div
            key={entry.sh_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.03 }}
          >
            <HistoryItem
              entry={entry}
              isLiked={isLikedTrack(entry)}
              isLiking={likingTrackId === `${entry.song.title}-${entry.song.artist}`}
              onToggle={() => onToggle(entry)}
              onShare={() => onShare(entry)}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
