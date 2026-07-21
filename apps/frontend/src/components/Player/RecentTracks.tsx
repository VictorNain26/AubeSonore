import { toast } from 'sonner';
import { useNowPlayingStore } from '../../lib/azuracast/store';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { shareTrack } from '../../lib/shareTrack';
import { RecentTrackCard } from './RecentTrackCard';
import type { SongEntry } from '../../lib/azuracast';

export function RecentTracks() {
  const history = useNowPlayingStore((s) => s.data?.song_history);
  const nowPlayingId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const error = useNowPlayingStore((s) => s.error);
  const isLoading = !useNowPlayingStore((s) => s.data);

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

  const entries = (history ?? []).filter((e) => e.sh_id !== nowPlayingId).slice(0, 6);

  return (
    <section aria-label="Vient de passer" className="min-w-0 border-t border-border">
      <div className="mx-auto w-full min-w-0 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-caption tracking-widest uppercase text-text-faint">
            Vient de passer
          </h2>
          {error && entries.length > 0 ? (
            <p className="text-caption text-text-faint">Historique partiel.</p>
          ) : null}
        </div>
        {isLoading && entries.length === 0 ? (
          <div className="flex gap-4 overflow-hidden pt-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                data-testid="recent-tracks-skeleton"
                className="flex shrink-0 items-center gap-3 py-1"
              >
                <div className="size-10 rounded-sm animate-pulse bg-surface-raised" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-28 rounded-sm animate-pulse bg-surface-raised" />
                  <div className="h-3 w-16 rounded-sm animate-pulse bg-surface-raised" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-caption text-text-faint pt-1.5">Aucun morceau pour l&apos;instant.</p>
        ) : (
          <div
            role="list"
            aria-label="Vient de passer"
            className="flex snap-x snap-proximity gap-4 overflow-x-auto pt-1.5 pb-1"
          >
            {entries.map((entry) => (
              <RecentTrackCard
                key={entry.sh_id}
                entry={entry}
                isLiked={isTrackLiked(tracks, entry.song.title, entry.song.artist)}
                isLiking={likingTrackId === `${entry.song.title}-${entry.song.artist}`}
                onToggle={() =>
                  void toggleLike(entry.song.title, entry.song.artist, entry.song.art)
                }
                onShare={() => handleShare(entry)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
