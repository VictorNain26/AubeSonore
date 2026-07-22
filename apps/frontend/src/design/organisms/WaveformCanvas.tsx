import type { RefObject } from 'react';

/** Presentational props for the antenna trace canvas. */
export interface WaveformCanvasViewProps {
  /** Ref attached to the drawing surface; the container owns the rAF loop. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function WaveformCanvasView({ canvasRef }: WaveformCanvasViewProps) {
  return <canvas ref={canvasRef} className="w-full max-w-full h-10" aria-hidden="true" />;
}
