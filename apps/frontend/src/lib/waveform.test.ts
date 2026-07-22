import { describe, it, expect } from 'vitest';
import { sampleBin, waveOffset } from './waveform';

describe('sampleBin', () => {
  it('spreads bins linearly across the whole width, without a centre bias', () => {
    const pts = 72;
    expect(sampleBin(0, pts, 2, 35)).toBe(2);
    expect(sampleBin(pts - 1, pts, 2, 35)).toBe(34);
    // monotone croissant
    let prev = -1;
    for (let i = 0; i < pts; i++) {
      const b = sampleBin(i, pts, 2, 35);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });
});

describe('waveOffset', () => {
  it('at rest breathes at low, non-zero, homogeneous amplitude', () => {
    const atCenter = Math.abs(waveOffset(0.3, 36, 1.0, false));
    const atEdge = Math.abs(waveOffset(0.3, 71, 1.0, false));
    expect(atCenter).toBeLessThanOrEqual(0.12);
    // homogène : le bord n'est pas atténué par rapport au centre
    const maxRest = Math.max(
      ...Array.from({ length: 72 }, (_, i) => Math.abs(waveOffset(0.3, i, 1.0, false)))
    );
    expect(maxRest).toBeGreaterThan(0.02);
    expect(atEdge).toBeLessThanOrEqual(maxRest);
  });

  it('while playing scales with the sampled value', () => {
    const loud = Math.abs(waveOffset(0.9, 10, 0.5, true));
    const quiet = Math.abs(waveOffset(0.2, 10, 0.5, true));
    expect(loud).toBeGreaterThan(quiet);
  });
});
