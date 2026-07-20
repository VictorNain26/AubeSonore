import { usePlayer } from '../../lib/player';
import { VolumeControl } from './VolumeControl';
import { AirPlayButton } from './AirPlayButton';

// Volume + output routing, the satellites of the play gesture.

export function SecondaryControls() {
  const volume = usePlayer((s) => s.volume);
  const isMuted = usePlayer((s) => s.isMuted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);

  return (
    <div className="flex items-center gap-1">
      <VolumeControl
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={setVolume}
        onToggleMute={toggleMute}
      />
      <AirPlayButton />
    </div>
  );
}
