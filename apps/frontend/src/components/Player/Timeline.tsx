import { formatTime } from '@aubesonore/core/format';
import { useNowPlaying } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { ElapsedReadout } from './ElapsedReadout';
import { WaveformCanvas } from './WaveformCanvas';

// Three-part horizontal timeline: elapsed text, waveform canvas, duration
// text. Each leaf owns its own animation cadence (setInterval(1000) for
// the readout, rAF inside the canvas) — the Timeline itself never
// re-renders on a frame.

export function Timeline() {
  const { data: np } = useNowPlaying();
  const isPlaying = usePlayer((s) => s.isPlaying);
  const nowPlaying = np?.now_playing;
  const duration = nowPlaying?.duration || 0;

  return (
    <div className="flex items-center gap-3 mb-5">
      <ElapsedReadout
        playedAt={nowPlaying?.played_at}
        duration={duration}
        isPlaying={isPlaying}
        className="text-xs text-foreground/50 tabular-nums w-10 text-right"
      />
      <div className="flex-1">
        <WaveformCanvas
          playedAt={nowPlaying?.played_at}
          duration={duration}
          isPlaying={isPlaying}
          songId={nowPlaying?.sh_id}
        />
      </div>
      <span className="text-xs text-foreground/50 tabular-nums w-10">{formatTime(duration)}</span>
    </div>
  );
}
