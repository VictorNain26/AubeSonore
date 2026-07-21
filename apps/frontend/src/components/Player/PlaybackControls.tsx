import { useCallback } from 'react';
import { usePlayer } from '../../lib/player';
import { PlaybackControlsView } from '../../design/molecules/PlaybackControls';

// Play / stop button, subscribing directly to usePlayer. The single flat
// accent block of the scene — the central gesture, deliberately alone.

export function PlaybackControls() {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const play = usePlayer((s) => s.play);
  const stop = usePlayer((s) => s.stop);

  const togglePlay = useCallback(() => {
    if (isPlaying) stop();
    else void play();
  }, [isPlaying, play, stop]);

  return <PlaybackControlsView isPlaying={isPlaying} onTogglePlay={togglePlay} />;
}
