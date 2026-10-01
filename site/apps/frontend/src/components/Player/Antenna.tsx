import { useNowPlayingStore } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { AntennaView } from '../../design/organisms/Antenna';

export function Antenna() {
  const shId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const isOnline = useNowPlayingStore((s) => s.data?.is_online ?? true);
  const listenerCount = useNowPlayingStore((s) => s.data?.listeners?.unique);
  const isPlaying = usePlayer((s) => s.isPlaying);

  return (
    <AntennaView
      isOnline={isOnline}
      isPlaying={isPlaying}
      songId={shId}
      listenerCount={listenerCount}
    />
  );
}
