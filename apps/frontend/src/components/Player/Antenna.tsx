import { useNowPlayingStore } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { WaveformCanvas } from './WaveformCanvas';

// The antenna trace: a live, audio-reactive waveform that signals the
// stream is on air. Not a timeline — a live broadcast has no scrubbable
// position, so there is no elapsed / duration readout, no seek.

export function Antenna() {
  const shId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const isOnline = useNowPlayingStore((s) => s.data?.is_online ?? true);
  const isPlaying = usePlayer((s) => s.isPlaying);

  if (!isOnline) {
    return (
      <p className="text-caption text-text-muted" aria-live="polite">
        Hors antenne — revenez un peu plus tard.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0">
      <WaveformCanvas isPlaying={isPlaying} songId={shId} />
    </div>
  );
}
