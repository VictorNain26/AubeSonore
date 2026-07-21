import { VolumeControl } from '../../components/Player/VolumeControl';
import { AirPlayButton } from '../../components/Player/AirPlayButton';

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
