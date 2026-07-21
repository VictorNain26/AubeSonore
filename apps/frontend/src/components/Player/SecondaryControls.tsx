import { usePlayer } from '../../lib/player';
import { SecondaryControlsView } from '../../design/molecules/SecondaryControls';

export function SecondaryControls() {
  const volume = usePlayer((s) => s.volume);
  const isMuted = usePlayer((s) => s.isMuted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);

  return (
    <SecondaryControlsView
      volume={volume}
      isMuted={isMuted}
      onVolumeChange={setVolume}
      onToggleMute={toggleMute}
    />
  );
}
