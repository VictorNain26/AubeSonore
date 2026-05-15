import { useShallow } from 'zustand/react/shallow';
import { formatTime } from '@aubesonore/core/format';
import { useNowPlayingStore } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { ElapsedReadout } from './ElapsedReadout';
import { WaveformCanvas } from './WaveformCanvas';

// Three-part horizontal timeline: elapsed text, waveform canvas, duration
// text. Each leaf owns its own animation cadence (setInterval(1000) for
// the readout, rAF inside the canvas) — the Timeline itself never
// re-renders on a frame.

export function Timeline() {
  const { shId, playedAt, duration } = useNowPlayingStore(
    useShallow((s) => ({
      shId: s.data?.now_playing?.sh_id,
      playedAt: s.data?.now_playing?.played_at,
      duration: s.data?.now_playing?.duration ?? 0,
    }))
  );
  const isPlaying = usePlayer((s) => s.isPlaying);

  return (
    <div className="flex items-center gap-3 mb-5">
      <ElapsedReadout
        playedAt={playedAt}
        duration={duration}
        isPlaying={isPlaying}
        className="text-xs text-foreground/50 tabular-nums w-10 text-right"
      />
      <div className="flex-1">
        <WaveformCanvas
          playedAt={playedAt}
          duration={duration}
          isPlaying={isPlaying}
          songId={shId}
        />
      </div>
      <span className="text-xs text-foreground/50 tabular-nums w-10">{formatTime(duration)}</span>
    </div>
  );
}
