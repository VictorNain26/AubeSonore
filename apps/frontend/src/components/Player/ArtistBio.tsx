import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { ArtistBioView } from '../../design/molecules/ArtistBio';

interface ArtistBioProps {
  onOpenPanel: () => void;
}

export function ArtistBio({ onOpenPanel }: ArtistBioProps) {
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data, isLoading } = useArtistInfo(artistName);

  if (!artistName) return null;

  if (isLoading) {
    return <ArtistBioView variant="loading" />;
  }

  if (!data?.bio) return null;

  return (
    <ArtistBioView variant="bio" bio={data.bio} artistName={artistName} onOpenPanel={onOpenPanel} />
  );
}
