import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { ArtistContextView } from '../../design/organisms/ArtistContext';

interface ArtistContextProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArtistContext({ isOpen, onClose }: ArtistContextProps) {
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data, isLoading } = useArtistInfo(artistName);

  if (!artistName) return null;

  return (
    <ArtistContextView
      artistName={artistName}
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      data={data}
    />
  );
}
