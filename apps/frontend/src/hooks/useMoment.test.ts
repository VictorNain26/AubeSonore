// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMoment } from './useMoment';

describe('useMoment', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the current moment and sets data-moment on html', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));

    const { result } = renderHook(() => useMoment());

    expect(result.current).toBe('day');
    expect(document.documentElement.dataset.moment).toBe('day');
  });

  it('re-renders with the new moment at the next boundary', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 16, 59, 0));

    const { result } = renderHook(() => useMoment());

    expect(result.current).toBe('day');

    act(() => {
      vi.setSystemTime(new Date(2026, 0, 1, 17, 0, 0));
      vi.advanceTimersByTime(60 * 1000 + 500);
    });

    expect(result.current).toBe('dusk');
    expect(document.documentElement.dataset.moment).toBe('dusk');
  });

  it('recomputes on visibilitychange when the tab becomes visible', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));

    const { result } = renderHook(() => useMoment());
    expect(result.current).toBe('day');

    act(() => {
      vi.setSystemTime(new Date(2026, 0, 1, 18, 0, 0));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe('dusk');
  });
});
