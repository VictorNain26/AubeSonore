import type { RefObject } from 'react';

/** Presentational props for the antenna trace canvas. */
export interface WaveformCanvasViewProps {
  /** Ref attached to the drawing surface; the container owns the rAF loop. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function WaveformCanvasView({ canvasRef }: WaveformCanvasViewProps) {
  return <canvas ref={canvasRef} className="h-10 w-full max-w-full" aria-hidden="true" />;
}
