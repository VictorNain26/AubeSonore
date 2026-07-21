import { useEffect, useLayoutEffect, useRef } from 'react';
import { getAnalyser } from '../../lib/player';

// ─────────────────────────────────────────────
// Antenna trace — an audio-reactive waveform with internal rAF.
// ─────────────────────────────────────────────
// This is NOT a progress bar. A live broadcast can't be scrubbed and you
// can't rewind it, so there is no elapsed/remaining and no played/unplayed
// split — every point is drawn the same way. It signals one thing: the
// antenna is on air, and this is the shape of its sound.
//
// The rAF loop lives inside the canvas so the React tree is never
// re-rendered on a frame tick. `isPlaying`/`songId` are read from refs so
// prop changes don't tear the loop down.
//
// Rendering is a single continuous ink line in `--color-text`: 78% alpha
// while live, a quiet 30% flat line when stopped. No gradients, no glow —
// a thin trace, not a light show.

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
  const textColorRef = useRef<string>('');
  const colorThemeKeyRef = useRef<string | undefined>(undefined);

  // Read latest props from refs inside the rAF callback so changes to
  // `isPlaying`/`songId` don't tear down the loop.
  const isPlayingRef = useRef(isPlaying);
  const songIdRef = useRef(songId);

  useLayoutEffect(() => {
    isPlayingRef.current = isPlaying;
    songIdRef.current = songId;
  });

  const pointsCount = 48;

  useEffect(() => {
    if (smoothedDataRef.current.length !== pointsCount) {
      smoothedDataRef.current = new Array(pointsCount).fill(0.3) as number[];
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
      // Mouvement réduit : la ligne reste figée (le temps interne
      // n'avance plus).
      if (!reducedMotion.matches) timeRef.current += deltaTime;

      const time = timeRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const isPlaying = isPlayingRef.current;

      ctx.clearRect(0, 0, width, height);

      const themeKey = document.documentElement.dataset.theme;
      if (themeKey !== colorThemeKeyRef.current || !textColorRef.current) {
        const style = getComputedStyle(document.documentElement);
        textColorRef.current = style.getPropertyValue('--color-text').trim();
        colorThemeKeyRef.current = themeKey;
      }
      const textColor = textColorRef.current;

      const analyser = getAnalyser();
      let frequencyData: Uint8Array | null = null;

      if (isPlaying && analyser && !reducedMotion.matches) {
        if (!frequencyDataRef.current) {
          frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(frequencyDataRef.current as Uint8Array<ArrayBuffer>);
        frequencyData = frequencyDataRef.current;
      }

      const mid = height / 2;
      const values: number[] = smoothedDataRef.current;
      ctx.beginPath();
      ctx.lineWidth = (isPlaying ? 1.6 : 1) * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = isPlaying
        ? `color-mix(in srgb, ${textColor} 78%, transparent)`
        : `color-mix(in srgb, ${textColor} 30%, transparent)`;
      const stepX = width / (pointsCount - 1);
      const amplitude = height * 0.42;

      for (let i = 0; i < pointsCount; i++) {
        if (frequencyData) {
          const startBin = 2;
          const endBin = 35;
          const usableBins = endBin - startBin;
          const center = pointsCount / 2;
          const distFromCenter = Math.abs(i - center) / center;
          const logDist = Math.pow(distFromCenter, 0.6);
          const binOffset = Math.floor(logDist * usableBins);
          const binIndex = startBin + binOffset;
          const value = frequencyData[binIndex] ?? 0;
          const normalized = 0.15 + (value / 255) * 0.8;
          const smoothingFactor = 0.35;
          const prevValue = values[i] || 0.3;
          const newValue = prevValue * (1 - smoothingFactor) + normalized * smoothingFactor;
          values[i] = newValue;
        }

        const currentValue = values[i] || 0.3;
        const signed = isPlaying ? (currentValue - 0.15) * Math.sin(i * 0.85 + time * 2.2) : 0;
        const y = mid + signed * amplitude;
        const x = i * stepX;
        if (i === 0) ctx.moveTo(x, y);
        else {
          const prevX = (i - 1) * stepX;
          const prevValue = values[i - 1] || 0.3;
          const prevSigned = isPlaying
            ? (prevValue - 0.15) * Math.sin((i - 1) * 0.85 + time * 2.2)
            : 0;
          const prevY = mid + prevSigned * amplitude;
          ctx.quadraticCurveTo(prevX + stepX / 2, (prevY + y) / 2, x, y);
        }
      }
      ctx.stroke();

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
