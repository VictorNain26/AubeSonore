import { useNowPlaying } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { useTrackChangeEvents } from '../../hooks/player/useTrackChangeEvents';
import { useListeningTimeTracker } from '../../hooks/player/useListeningTimeTracker';

// Invisible component that hosts player side-effects driven by external
// state (now-playing track flips, audio playing state). Keeps these
// effects out of the render tree of the visible Player, which means
// Player no longer needs to exist solely to host them and can be
// unmounted independently without losing the side-effect bookkeeping.

export function PlayerSideEffects(): null {
  const { data: np } = useNowPlaying();
  const isPlaying = usePlayer((s) => s.isPlaying);

  useTrackChangeEvents(
    np?.now_playing?.sh_id,
    np?.now_playing?.song.artist,
    np?.now_playing?.song.title
  );
  useListeningTimeTracker(isPlaying);

  return null;
}
