import { useShallow } from 'zustand/react/shallow';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useInkFlip } from '../../lib/motion';
import { TrackMetaView } from '../../design/organisms/TrackMeta';

// The masthead: track title as a large headline, artist as its dek. On a
// track flip the block does a soft crossfade with a slight blur. Actions
// (like/share) live in TrackActions, in the action bar.

interface TrackMetaProps {
  onArtistInfo?: (() => void) | undefined;
}

export function TrackMeta({ onArtistInfo }: TrackMetaProps) {
  const inkFlip = useInkFlip();
  const { shId, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      shId: s.data?.now_playing?.sh_id,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );

  return (
    <TrackMetaView
      inkFlip={inkFlip}
      title={title}
      artist={artist}
      shId={shId}
      {...(onArtistInfo ? { onArtistInfo } : {})}
    />
  );
}
