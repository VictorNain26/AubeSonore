import { toast } from 'sonner';
import { useRecentHistory } from '../../hooks/useRecentHistory';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { shareTrack } from '../../lib/shareTrack';
import { StationLogRow } from './StationLogRow';
import type { SongEntry } from '../../lib/azuracast';

// The station log — what just aired, read top-down like a broadcast log
// (newest first). A live stream can't be rewound, so this is how you catch
// a track you missed. Vertical: a side column on desktop, a capped list
// under the player on narrow screens.
export function StationLog() {
  const { entries, isLoading, error } = useRecentHistory();
  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();

  const handleShare = (entry: SongEntry) => {
    const likedTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === entry.song.title.toLowerCase() &&
        t.artist.toLowerCase() === entry.song.artist.toLowerCase()
    );
    const url = getTrackShareUrl(
      likedTrack ?? { title: entry.song.title, artist: entry.song.artist },
      preferences?.preferredPlatform
    );
    void shareTrack({
      title: entry.song.title,
      artist: entry.song.artist,
      url,
    })
      .then((result) => {
        if (result === 'copied') toast('Lien copié');
      })
      .catch(() => {
        toast('Partage impossible');
      });
  };

  return (
    <section className="flex min-h-0 flex-col pt-4 lg:pt-0 lg:border-l lg:border-line lg:pl-6">
      <div className="rule mb-4 lg:hidden" />
      <h3 className="eyebrow mb-2 shrink-0">Vient de passer</h3>
      {error && (
        <p className="mb-2 text-caption text-ink-faint">
          Historique partiel — actualisation impossible pour le moment.
        </p>
      )}
      {isLoading && entries.length === 0 ? (
        <div className="flex flex-col divide-y divide-line">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className="size-9 shrink-0 rounded-md skeleton" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="h-3.5 w-2/3 skeleton" />
                <div className="h-3 w-1/3 skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-caption text-ink-faint">Aucun morceau pour l&apos;instant.</p>
      ) : (
        <div
          role="list"
          className="-mt-1 flex min-h-0 flex-col divide-y divide-line lg:overflow-y-auto"
        >
          {entries.slice(0, 6).map((entry) => (
            <StationLogRow
              key={entry.sh_id}
              entry={entry}
              isLiked={isTrackLiked(tracks, entry.song.title, entry.song.artist)}
              isLiking={likingTrackId === `${entry.song.title}-${entry.song.artist}`}
              onToggle={() => void toggleLike(entry.song.title, entry.song.artist, entry.song.art)}
              onShare={() => handleShare(entry)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
