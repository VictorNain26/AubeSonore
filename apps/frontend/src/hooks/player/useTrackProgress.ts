import { useEffect, useRef, useState } from 'react';

// Smooth client-side elapsed counter for the currently playing track.
// Server reports elapsed only every ~10s; we interpolate frames in between
// via requestAnimationFrame while isPlaying, and resync the baseline whenever
// the server returns a fresh elapsed (or a new track via shId).

export function useTrackProgress(
  serverElapsed: number | undefined,
  shId: number | undefined,
  duration: number,
  isPlaying: boolean
): { elapsed: number; progress: number } {
  const [elapsed, setElapsed] = useState(0);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0);

  // Resync baseline on every server tick or new track.
  useEffect(() => {
    if (serverElapsed !== undefined) {
      baseElapsedRef.current = serverElapsed;
      startTimeRef.current = performance.now();
    }
  }, [serverElapsed, shId]);

  // Animate elapsed forward while playing.
  useEffect(() => {
    if (!isPlaying || duration <= 0) return;

    startTimeRef.current = performance.now();
    const animate = () => {
      const now = performance.now();
      const deltaSeconds = (now - startTimeRef.current) / 1000;
      const next = Math.min(baseElapsedRef.current + deltaSeconds, duration);
      setElapsed(next);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [duration, isPlaying]);

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  return { elapsed, progress };
}
