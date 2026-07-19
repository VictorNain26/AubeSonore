import { useEffect, useLayoutEffect, useRef } from 'react';
import { getAnalyser } from '../../lib/player';

// ─────────────────────────────────────────────
// Antenna trace — an audio-reactive waveform with internal rAF.
// ─────────────────────────────────────────────
// This is NOT a progress bar. A live broadcast can't be scrubbed and you
// can't rewind it, so there is no elapsed/remaining and no played/unplayed
// split — every bar is drawn the same way. It signals one thing: the
// antenna is on air, and this is the shape of its sound.
//
// The rAF loop lives inside the canvas so the React tree is never
// re-rendered on a frame tick. `isPlaying`/`songId` are read from refs so
// prop changes don't tear the loop down.
//
// Rendering is a fine ink stroke: live bars in flat `--color-accent`
// (~alpha 0.82), a quiet resting trace in `--color-ink` at low alpha when
// stopped. No gradients, no glow — a thin trace, not a light show.

interface WaveformCanvasProps {
  isPlaying: boolean;
  songId: number | undefined;
}

export function WaveformCanvas({ isPlaying, songId }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const smoothedDataRef = useRef<number[]>([]);
  const accentColorRef = useRef<string>('');
  const inkColorRef = useRef<string>('');
  const colorMomentKeyRef = useRef<string | undefined>(undefined);

  // Read latest props from refs inside the rAF callback so changes to
  // `isPlaying`/`songId` don't tear down the loop.
  const isPlayingRef = useRef(isPlaying);
  const songIdRef = useRef(songId);

  useLayoutEffect(() => {
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

    // Le canvas est dessiné en pixels physiques (taille CSS × dpr) pour que
    // le trait reste net sur écran haute densité, quelle que soit la largeur.
    let dpr = 1;
    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
      // Mouvement réduit : les barres restent figées (le temps interne
      // n'avance plus).
      if (!reducedMotion.matches) timeRef.current += deltaTime;

      const time = timeRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const isPlaying = isPlayingRef.current;
      const songId = songIdRef.current;

      ctx.clearRect(0, 0, width, height);

      const barWidth = width / barsCount;
      const gap = 3 * dpr;

      const momentKey = document.documentElement.dataset.moment;
      if (momentKey !== colorMomentKeyRef.current || !accentColorRef.current) {
        const style = getComputedStyle(document.documentElement);
        accentColorRef.current = style.getPropertyValue('--color-accent').trim();
        inkColorRef.current = style.getPropertyValue('--color-ink').trim();
        colorMomentKeyRef.current = momentKey;
      }
      const accentColor = accentColorRef.current;
      const inkColor = inkColorRef.current;
      const liveFill = `color-mix(in srgb, ${accentColor} 82%, transparent)`;
      const idleFill = `color-mix(in srgb, ${inkColor} 22%, transparent)`;
      const fill = isPlaying ? liveFill : idleFill;

      const analyser = getAnalyser();
      let frequencyData: Uint8Array | null = null;

      if (isPlaying && analyser && !reducedMotion.matches) {
        if (!frequencyDataRef.current) {
          frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(frequencyDataRef.current as Uint8Array<ArrayBuffer>);
        frequencyData = frequencyDataRef.current;
      }

      ctx.fillStyle = fill;

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

        ctx.beginPath();
        ctx.roundRect(barX, y, barW, barHeight, dpr);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full max-w-full h-8" aria-hidden="true" />;
}
