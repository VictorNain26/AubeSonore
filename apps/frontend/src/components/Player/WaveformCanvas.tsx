import { useEffect, useLayoutEffect, useRef } from 'react';
import { getAnalyser } from '../../lib/player';

// ─────────────────────────────────────────────
// Audio-reactive waveform with internal rAF.
// ─────────────────────────────────────────────
// Receives `playedAt` / `duration` / `isPlaying` as primitive props.
// Live progress is derived from `played_at` (immutable per track) inside
// the rAF loop — the React tree is never re-rendered on a frame tick,
// which is the whole point of moving the loop down into the canvas.
//
// Per AzuraCast docs on the static now-playing JSON: the server-reported
// `elapsed` is frozen at file-write time, so clients must compute live
// time from `played_at` against the current UNIX timestamp.
//
// Rendering is a fine ink stroke: played bars in flat `--color-accent`
// (alpha 0.9), unplayed bars in `--color-ink` at low alpha. No gradients,
// no shadow/glow — the waveform reads as a thin trace, not a light show.

interface WaveformCanvasProps {
  playedAt: number | undefined;
  duration: number;
  isPlaying: boolean;
  songId: number | undefined;
}

export function WaveformCanvas({ playedAt, duration, isPlaying, songId }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const smoothedDataRef = useRef<number[]>([]);
  const accentColorRef = useRef<string>('');
  const inkColorRef = useRef<string>('');
  const colorMomentKeyRef = useRef<string | undefined>(undefined);

  // Read latest props from refs inside the rAF callback so changes to
  // `playedAt`/`duration`/`isPlaying`/`songId` don't tear down the loop.
  const playedAtRef = useRef(playedAt);
  const durationRef = useRef(duration);
  const isPlayingRef = useRef(isPlaying);
  const songIdRef = useRef(songId);

  useLayoutEffect(() => {
    playedAtRef.current = playedAt;
    durationRef.current = duration;
    isPlayingRef.current = isPlaying;
    songIdRef.current = songId;
  });

  const barsCount = 48;

  // Initialize smoothed bar heights once
  useEffect(() => {
    if (smoothedDataRef.current.length !== barsCount) {
      smoothedDataRef.current = new Array(barsCount).fill(0.3) as number[];
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let paused = typeof document !== 'undefined' && document.hidden;

    const handleVisibility = () => {
      paused = document.hidden;
      if (!paused) {
        lastTime = performance.now();
        animationRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const draw = (currentTime: number): void => {
      if (paused) return;
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      timeRef.current += deltaTime;

      const time = timeRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const playedAt = playedAtRef.current;
      const duration = durationRef.current;
      const isPlaying = isPlayingRef.current;
      const songId = songIdRef.current;

      const elapsedSec =
        playedAt !== undefined && duration > 0
          ? Math.max(0, Math.min(duration, Date.now() / 1000 - playedAt))
          : 0;
      const currentProgress = duration > 0 ? (elapsedSec / duration) * 100 : 0;

      ctx.clearRect(0, 0, width, height);

      const barWidth = width / barsCount;
      const gap = 3;
      const progressX = (currentProgress / 100) * width;

      const momentKey = document.documentElement.dataset.moment;
      if (momentKey !== colorMomentKeyRef.current || !accentColorRef.current) {
        const style = getComputedStyle(document.documentElement);
        accentColorRef.current = style.getPropertyValue('--color-accent').trim();
        inkColorRef.current = style.getPropertyValue('--color-ink').trim();
        colorMomentKeyRef.current = momentKey;
      }
      const accentColor = accentColorRef.current;
      const inkColor = inkColorRef.current;
      const playedFill = `color-mix(in srgb, ${accentColor} 90%, transparent)`;
      const unplayedFill = `color-mix(in srgb, ${inkColor} 25%, transparent)`;

      const analyser = getAnalyser();
      let frequencyData: Uint8Array | null = null;

      if (isPlaying && analyser) {
        if (!frequencyDataRef.current) {
          frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(frequencyDataRef.current as Uint8Array<ArrayBuffer>);
        frequencyData = frequencyDataRef.current;
      }

      for (let i = 0; i < barsCount; i++) {
        const x = i * barWidth;
        let barHeight: number;

        if (frequencyData) {
          const startBin = 2;
          const endBin = 35;
          const usableBins = endBin - startBin;
          const center = barsCount / 2;
          const distFromCenter = Math.abs(i - center) / center;
          const logDist = Math.pow(distFromCenter, 0.6);
          const binOffset = Math.floor(logDist * usableBins);
          const binIndex = startBin + binOffset;
          const value = frequencyData[binIndex] ?? 0;
          const normalized = 0.15 + (value / 255) * 0.8;
          const smoothingFactor = 0.35;
          const prevValue = smoothedDataRef.current[i] ?? 0.3;
          const newValue = prevValue * (1 - smoothingFactor) + normalized * smoothingFactor;
          smoothedDataRef.current[i] = newValue;
          barHeight = newValue * height * 0.9;
        } else {
          const position = i / barsCount;
          const seed = songId ?? 1;
          if (isPlaying) {
            const wave1 = Math.sin(time * 3 + i * 0.15 + seed * 0.01) * 0.15;
            const wave2 = Math.sin(time * 5 + i * 0.25 + seed * 0.02) * 0.1;
            const wave3 = Math.sin(time * 2 + position * Math.PI * 2) * 0.12;
            const base = 0.45 + wave1 + wave2 + wave3;
            barHeight = Math.max(0.2, Math.min(0.9, base)) * height * 0.85;
          } else {
            const breath = Math.sin(time * 0.8 + i * 0.1) * 0.08;
            const baseWave = Math.sin(position * Math.PI * 2 + seed * 0.01) * 0.15;
            barHeight = (0.35 + baseWave + breath) * height * 0.7;
          }
        }

        const y = (height - barHeight) / 2;
        const barX = x + gap / 2;
        const barW = barWidth - gap;

        if (x < progressX) {
          const fillWidth = Math.min(barW, progressX - barX);
          if (fillWidth > 0) {
            ctx.fillStyle = playedFill;
            ctx.beginPath();
            ctx.roundRect(barX, y, fillWidth, barHeight, 1);
            ctx.fill();
          }
        }

        if (x + barW > progressX) {
          const startX = Math.max(barX, progressX);
          const remainingWidth = barX + barW - startX;
          if (remainingWidth > 0) {
            ctx.fillStyle = unplayedFill;
            ctx.beginPath();
            ctx.roundRect(startX, y, remainingWidth, barHeight, 1);
            ctx.fill();
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} width={384} height={32} className="w-full max-w-full h-8" />;
}
