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
    <section aria-label="Vient de passer" className="border-t border-border">
      <div className="mx-auto w-full">
        <h2 className="text-caption px-6 pt-3 pb-2">Vient de passer</h2>
        {error && entries.length > 0 ? (
          <p className="text-caption text-text-faint px-6 pb-3">Historique partiel.</p>
        ) : null}
        {isLoading && entries.length === 0 ? (
          <ul className="flex flex-col divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-6 py-3">
                <div className="size-10 shrink-0 rounded-sm animate-pulse bg-surface-raised" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="h-3.5 w-2/3 rounded-sm animate-pulse bg-surface-raised" />
                  <div className="h-3 w-1/3 rounded-sm animate-pulse bg-surface-raised" />
                </div>
              </li>
            ))}
          </ul>
        ) : entries.length === 0 ? (
          <p className="text-caption text-text-faint px-6 pb-3">
            Aucun morceau pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
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
          </ul>
        )}
      </div>
    </section>
  );
}
