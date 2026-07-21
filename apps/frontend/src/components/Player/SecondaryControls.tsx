import { usePlayer } from '../../lib/player';
import { VolumeControl } from './VolumeControl';
import { AirPlayButton } from './AirPlayButton';

// Volume + output routing, the satellites of the play gesture.

export interface SecondaryControlsViewProps {
  /** Volume courant (0-1). */
  volume: number;
  /** Le flux est actuellement coupé. */
  isMuted: boolean;
  /** Appelé avec la nouvelle valeur de volume. */
  onVolumeChange: (volume: number) => void;
  /** Appelé pour basculer l'état muet. */
  onToggleMute: () => void;
}

export function SecondaryControlsView({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: SecondaryControlsViewProps) {
  return (
    <div className="flex items-center gap-1">
      <VolumeControl
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
      />
      <AirPlayButton />
    </div>
  );
}

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
