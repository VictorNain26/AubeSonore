import { toast } from 'sonner';
import { useNowPlayingStore } from '../../lib/azuracast/store';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { shareTrack } from '../../lib/shareTrack';
import { RecentTracksRail, type RailEntry } from '../../design/organisms/RecentTracksRail';
import type { SongEntry } from '../../lib/azuracast';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function RecentTracks() {
  const history = useNowPlayingStore((s) => s.data?.song_history);
  const nowPlayingId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const error = useNowPlayingStore((s) => s.error);
  const isLoading = !useNowPlayingStore((s) => s.data);

  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();

  const entries = (history ?? []).filter((e) => e.sh_id !== nowPlayingId).slice(0, 6);
  const byId = new Map<number, SongEntry>(entries.map((e) => [e.sh_id, e]));

  const railEntries: RailEntry[] = entries.map((e) => ({
    id: e.sh_id,
    title: e.song.title,
    artist: e.song.artist,
    time: timeFormatter.format(new Date(e.played_at * 1000)),
    isLiked: isTrackLiked(tracks, e.song.title, e.song.artist),
    isLiking: likingTrackId === `${e.song.title}-${e.song.artist}`,
    ...(e.song.art ? { art: e.song.art } : {}),
  }));

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
    <RecentTracksRail
      entries={railEntries}
      isLoading={isLoading}
      partial={Boolean(error) && entries.length > 0}
      onToggle={(id) => {
        const entry = byId.get(id);
        if (entry) void toggleLike(entry.song.title, entry.song.artist, entry.song.art);
      }}
      onShare={(id) => {
        const entry = byId.get(id);
        if (entry) handleShare(entry);
      }}
    />
  );
}
