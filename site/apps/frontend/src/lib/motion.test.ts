// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const useReducedMotion = vi.fn();
vi.mock('motion/react', () => ({ useReducedMotion }));

const { useInkFlip, useRowExit, useRailEntry } = await import('./motion');

describe('useInkFlip', () => {
  it('returns opacity-only variants with zero duration when reduced motion is preferred', () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useInkFlip());

    expect(result.current).toEqual({
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 },
    });
  });

  it('returns blur crossfade variants with a 0.35s duration by default', () => {
    useReducedMotion.mockReturnValue(false);
    const { result } = renderHook(() => useInkFlip());

    expect(result.current).toEqual({
      initial: { opacity: 0, filter: 'blur(3px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(3px)' },
      transition: { duration: 0.6, ease: [0.2, 0, 0, 1] },
    });
  });
});

describe('useRowExit', () => {
  it('collapses height and fades by default', () => {
    useReducedMotion.mockReturnValue(false);
    const { result } = renderHook(() => useRowExit());

    expect(result.current).toEqual({
      exit: { height: 0, opacity: 0 },
      transition: { duration: 0.5, ease: [0.2, 0, 0, 1] },
    });
  });

  it('removes instantly when reduced motion is preferred', () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useRowExit());

    expect(result.current).toEqual({
      exit: { opacity: 0 },
      transition: { duration: 0 },
    });
  });
});

describe('useRailEntry', () => {
  it('slides and fades in by default', () => {
    useReducedMotion.mockReturnValue(false);
    const { result } = renderHook(() => useRailEntry());

    expect(result.current).toEqual({
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.6, ease: [0.2, 0, 0, 1] },
    });
  });

  it('appears instantly when reduced motion is preferred', () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useRailEntry());

    expect(result.current).toEqual({
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      transition: { duration: 0 },
    });
  });
});
