import { useLocation } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { MiniPlayer } from '../design/organisms/MiniPlayer';
import { useNowPlayingStore } from '../lib/azuracast';
import { usePlayer } from '../lib/player';

export function MiniPlayerContainer() {
  const { pathname } = useLocation();
  const { artUrl, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      artUrl: s.data?.now_playing?.song.art,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );
  const { isPlaying, play, stop } = usePlayer(
    useShallow((s) => ({ isPlaying: s.isPlaying, play: s.play, stop: s.stop }))
  );

  // The home page already shows the full player; a second bar would duplicate it.
  if (pathname === '/') return null;

  return (
    <MiniPlayer
      title={title}
      artist={artist}
      artworkUrl={artUrl ?? null}
      isPlaying={isPlaying}
      onTogglePlay={() => {
        if (isPlaying) {
          stop();
        } else {
          void play();
        }
      }}
    />
  );
}
