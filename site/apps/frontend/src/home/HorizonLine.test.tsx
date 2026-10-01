// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HorizonLine, LAYERS, stepMotion } from './HorizonLine';

function fakeContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    strokeStyle: '',
  };
}

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    }
  );
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function runFrames(count: number) {
  for (let i = 0; i < count; i++) {
    const next = frames.shift();
    next?.(performance.now() + i * 16);
  }
}

describe('stepMotion', () => {
  const rest = { liveness: 0, drift: LAYERS.map(() => 0) };

  it('swells towards live gradually, never in one jump', () => {
    const after = stepMotion(rest, true, 0.1);
    expect(after.liveness).toBeGreaterThan(0);
    expect(after.liveness).toBeLessThan(0.5);

    let motion = rest;
    for (let i = 0; i < 300; i++) motion = stepMotion(motion, true, 1 / 60);
    expect(motion.liveness).toBeGreaterThan(0.99);
  });

  it('drifts the two traces against each other, faster while live', () => {
    const atRest = stepMotion(rest, false, 1);
    expect(Math.sign(atRest.drift[0] ?? 0)).toBe(-Math.sign(atRest.drift[1] ?? 0));

    const live = stepMotion({ ...rest, liveness: 1 }, true, 1);
    expect(Math.abs(live.drift[0] ?? 0)).toBeGreaterThan(Math.abs(atRest.drift[0] ?? 0));
  });
});

describe('HorizonLine', () => {
  it('draws the two traces on every frame', () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    );

    render(<HorizonLine isPlaying={false} />);
    runFrames(2);

    expect(ctx.beginPath).toHaveBeenCalledTimes(4);
    expect(ctx.stroke).toHaveBeenCalledTimes(4);
    expect(ctx.lineTo).toHaveBeenCalled();
  });

  it('stops drawing on unmount', () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    );

    const { unmount } = render(<HorizonLine isPlaying={false} />);
    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
