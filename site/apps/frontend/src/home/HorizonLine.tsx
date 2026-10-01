import { useEffect, useLayoutEffect, useRef } from 'react';

// ─────────────────────────────────────────────
// The horizon line: two traces drifting against each other, each a sum of
// three sines. At rest they barely ripple and drift slowly; while the live
// plays they swell and speed up. Amplitude and speed ease between the two, so
// pressing Écouter never makes the line jump.
//
// One period spans the visible width, so the drift loops seamlessly. The rAF
// loop lives in the canvas: a frame never re-renders the React tree, and
// `isPlaying` is read from a ref so a change does not restart the loop.
// ─────────────────────────────────────────────

type Sine = readonly [harmonic: number, weight: number, phase: number];

export interface WaveLayer {
  sines: readonly Sine[];
  /** Share of the common amplitude this trace gets. */
  gain: number;
  /** Seconds to drift one width, at rest and while playing. */
  period: { rest: number; live: number };
  /** 1 drifts left, -1 drifts right. */
  direction: 1 | -1;
  /** Ink opacity and stroke width (CSS px). */
  alpha: number;
  width: number;
}

export const LAYERS: readonly WaveLayer[] = [
  {
    sines: [
      [2, 0.55, 0],
      [5, 0.3, 1.3],
      [11, 0.15, 0.4],
    ],
    gain: 1,
    period: { rest: 28, live: 9 },
    direction: 1,
    alpha: 1,
    width: 1.4,
  },
  {
    sines: [
      [3, 0.5, 2.1],
      [7, 0.35, 0.2],
      [13, 0.15, 1.9],
    ],
    gain: 0.8,
    period: { rest: 36, live: 13 },
    direction: -1,
    alpha: 0.3,
    width: 1,
  },
];

/** Peak offset as a share of the canvas height, at rest and while playing. */
export const AMPLITUDE = { rest: 5 / 120, live: 30 / 120 };

/** Seconds for amplitude and speed to cover about two thirds of a change. */
const EASE_SECONDS = 0.6;

/** Signed offset of a trace (about -1..1) at `u`, a position in widths. */
export function traceOffset(sines: readonly Sine[], u: number): number {
  return sines.reduce((y, [n, w, p]) => y + w * Math.sin(2 * Math.PI * n * u + p), 0);
}

export interface WaveMotion {
  /** Eased 0 (rest) .. 1 (live). */
  liveness: number;
  /** Drift of each layer, in widths. */
  drift: number[];
}

/** Advances the motion by `dt` seconds towards rest or live. */
export function stepMotion(motion: WaveMotion, isPlaying: boolean, dt: number): WaveMotion {
  const target = isPlaying ? 1 : 0;
  const liveness = target + (motion.liveness - target) * Math.exp(-dt / EASE_SECONDS);
  const drift = LAYERS.map((layer, i) => {
    const period = layer.period.rest + (layer.period.live - layer.period.rest) * liveness;
    return ((motion.drift[i] ?? 0) + (layer.direction * dt) / period) % 1;
  });
  return { liveness, drift };
}

interface HorizonLineProps {
  isPlaying: boolean;
  className?: string;
}

export function HorizonLine({ isPlaying, className }: HorizonLineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlayingRef = useRef(isPlaying);

  useLayoutEffect(() => {
    isPlayingRef.current = isPlaying;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Drawn in device pixels so the stroke stays crisp on dense screens.
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
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
    let motion: WaveMotion = {
      liveness: isPlayingRef.current ? 1 : 0,
      drift: LAYERS.map(() => 0),
    };
    let frame = 0;
    let lastTime = performance.now();

    const draw = (now: number): void => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      // Reduced motion: a still line at rest.
      if (!reducedMotion.matches) motion = stepMotion(motion, isPlayingRef.current, dt);

      const { width, height } = canvas;
      const mid = height / 2;
      const amplitude =
        height * (AMPLITUDE.rest + (AMPLITUDE.live - AMPLITUDE.rest) * motion.liveness);
      const step = 4 * dpr;

      ctx.clearRect(0, 0, width, height);
      LAYERS.forEach((layer, i) => {
        const drift = motion.drift[i] ?? 0;
        ctx.beginPath();
        for (let x = 0; x <= width + step; x += step) {
          const y = mid + amplitude * layer.gain * traceOffset(layer.sines, x / width + drift);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = layer.width * dpr;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = `color-mix(in srgb, ${ink} ${Math.round(layer.alpha * 100)}%, transparent)`;
        ctx.stroke();
      });

      frame = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        lastTime = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
