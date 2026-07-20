// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const useReducedMotion = vi.fn();
vi.mock('motion/react', () => ({ useReducedMotion }));

const { useInkFlip } = await import('./motion');

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

  it('returns blur crossfade variants with a 0.25s duration by default', () => {
    useReducedMotion.mockReturnValue(false);
    const { result } = renderHook(() => useInkFlip());

    expect(result.current).toEqual({
      initial: { opacity: 0, filter: 'blur(3px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(3px)' },
      transition: { duration: 0.25, ease: 'easeOut' },
    });
  });
});
