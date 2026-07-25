import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { useArtistPanelStore } from '../../stores/artistPanelStore';
import { ArtistContextView } from '../../design/organisms/ArtistContext';

export function ArtistContext() {
  const panelArtist = useArtistPanelStore((s) => s.artistName);
  const close = useArtistPanelStore((s) => s.close);
  const nowPlayingArtist = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);

  const artistName = panelArtist ?? nowPlayingArtist;
  const { data, isLoading } = useArtistInfo(artistName);

  if (!artistName) return null;

  return (
    <ArtistContextView
      artistName={artistName}
      isOpen={panelArtist !== null}
      onClose={close}
      isLoading={isLoading}
      data={data}
    />
  );
}
