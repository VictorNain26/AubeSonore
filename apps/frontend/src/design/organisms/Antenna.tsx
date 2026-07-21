import { WaveformCanvas } from '../../components/Player/WaveformCanvas';

// The antenna trace: a live, audio-reactive waveform that signals the
// stream is on air. Not a timeline — a live broadcast has no scrubbable
// position, so there is no elapsed / duration readout, no seek.

export interface AntennaViewProps {
  /** Le stream est actuellement en ligne. */
  isOnline: boolean;
  /** La lecture est en cours (anime le tracé de l'onde). */
  isPlaying: boolean;
  /** Identifiant du morceau courant, pour réamorcer le tracé au changement. */
  songId: number | undefined;
}

export function AntennaView({ isOnline, isPlaying, songId }: AntennaViewProps) {
  if (!isOnline) {
    return (
      <p className="text-caption text-text-muted" aria-live="polite">
        Hors antenne — revenez un peu plus tard.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0">
      <WaveformCanvas isPlaying={isPlaying} songId={songId} />
    </div>
  );
}
