import { useNowPlayingStore } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { WaveformCanvas } from './WaveformCanvas';

// The antenna trace: a live, audio-reactive waveform that signals the
// stream is on air. Not a timeline — a live broadcast has no scrubbable
// position, so there is no elapsed / duration readout, no seek.

export function Antenna() {
  const shId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const isPlaying = usePlayer((s) => s.isPlaying);

  if (!isPlaying) {
    return (
      <p className="text-caption text-text-muted">Appuyez sur lecture pour écouter le direct.</p>
    );
  }

  return (
    <div className="w-full min-w-0">
      <WaveformCanvas isPlaying={isPlaying} songId={shId} />
    </div>
  );
}
