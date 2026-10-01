import { useState } from 'react';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { useArtistPanelStore } from '../../stores/artistPanelStore';
import { ArtistContextView } from '../../design/organisms/ArtistContext';

export function ArtistContext() {
  const panelArtist = useArtistPanelStore((s) => s.artistName);
  const openNonce = useArtistPanelStore((s) => s.openNonce);
  const close = useArtistPanelStore((s) => s.close);
  const nowPlayingArtist = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const [browsing, setBrowsing] = useState<string | null>(null);
  const [prevOpenNonce, setPrevOpenNonce] = useState(openNonce);

  if (openNonce !== prevOpenNonce) {
    setPrevOpenNonce(openNonce);
    setBrowsing(null);
  }

  const artistName = browsing ?? panelArtist ?? nowPlayingArtist;
  const { data, isLoading } = useArtistInfo(artistName);

  if (!artistName) return null;

  return (
    <ArtistContextView
      artistName={artistName}
      isOpen={panelArtist !== null}
      onClose={close}
      isLoading={isLoading}
      data={data}
      onSelectSimilar={setBrowsing}
    />
  );
}
