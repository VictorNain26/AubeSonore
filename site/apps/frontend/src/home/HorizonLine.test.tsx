// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HorizonLine } from './HorizonLine';

function fakeContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
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

describe('HorizonLine', () => {
  it('draws one continuous line per frame, thin and faint at rest', () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    );

    render(<HorizonLine isPlaying={false} songId={1} />);
    runFrames(2);

    expect(ctx.beginPath).toHaveBeenCalledTimes(2);
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.strokeStyle).toContain('30%');
  });

  it('draws a stronger line while the stream plays', () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    );

    render(<HorizonLine isPlaying songId={1} />);
    runFrames(1);

    expect(ctx.strokeStyle).toContain('78%');
  });

  it('stops drawing on unmount', () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    );

    const { unmount } = render(<HorizonLine isPlaying={false} songId={1} />);
    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
