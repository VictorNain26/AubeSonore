import { WaveformCanvas } from '../../components/Player/WaveformCanvas';
import * as m from '@/paraglide/messages.js';

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
  /** Auditeurs uniques en direct, `undefined` avant le premier payload. */
  listenerCount: number | undefined;
}

export function AntennaView({ isOnline, isPlaying, songId, listenerCount }: AntennaViewProps) {
  if (!isOnline) {
    return (
      <p className="text-caption text-text-muted" aria-live="polite">
        {m.antenna_off_air()}
      </p>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1">
        <WaveformCanvas isPlaying={isPlaying} songId={songId} />
      </div>
      {listenerCount !== undefined && (
        <p className="shrink-0 text-caption text-text-faint">
          {listenerCount > 1
            ? m.antenna_listeners_other({ count: listenerCount })
            : m.antenna_listeners_one({ count: listenerCount })}
        </p>
      )}
    </div>
  );
}
