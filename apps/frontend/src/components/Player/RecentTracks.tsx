import { toast } from 'sonner';
import { useNowPlayingStore } from '../../lib/azuracast/store';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { shareTrack, getRadioShareUrl } from '../../lib/shareTrack';
import { RecentTracksRail, type RailEntry } from '../../design/organisms/RecentTracksRail';
import type { SongEntry } from '../../lib/azuracast';

export function RecentTracks() {
  const history = useNowPlayingStore((s) => s.data?.song_history);
  const nowPlayingId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const error = useNowPlayingStore((s) => s.error);
  const isLoading = !useNowPlayingStore((s) => s.data);

  const tracks = useLikedTracksStore((s) => s.tracks);
  const { likingTrackId, toggleLike } = useLikeAction();

  const entries = (history ?? []).filter((e) => e.sh_id !== nowPlayingId).slice(0, 6);
  const byId = new Map<number, SongEntry>(entries.map((e) => [e.sh_id, e]));

  const railEntries: RailEntry[] = entries.map((e) => ({
    id: e.sh_id,
    title: e.song.title,
    artist: e.song.artist,
    isLiked: isTrackLiked(tracks, e.song.title, e.song.artist),
    isLiking: likingTrackId === `${e.song.title}-${e.song.artist}`,
    ...(e.song.art ? { art: e.song.art } : {}),
  }));

  const handleShare = (entry: SongEntry) => {
    void shareTrack({
      title: entry.song.title,
      artist: entry.song.artist,
      url: getRadioShareUrl(entry.song.title, entry.song.artist),
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
