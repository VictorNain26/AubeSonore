// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMoment } from './useMoment';

describe('useMoment', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    window.history.replaceState(null, '', '/');
  });

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

  describe('dev override via ?moment=', () => {
    it('forces the moment from the query param in dev', () => {
      vi.stubEnv('DEV', true);
      vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
      window.history.replaceState(null, '', '/?moment=dawn');

      const { result } = renderHook(() => useMoment());

      expect(result.current).toBe('dawn');
      expect(document.documentElement.dataset.moment).toBe('dawn');
    });

    it('keeps the forced moment across boundaries', () => {
      vi.stubEnv('DEV', true);
      vi.setSystemTime(new Date(2026, 0, 1, 16, 59, 0));
      window.history.replaceState(null, '', '/?moment=night');

      const { result } = renderHook(() => useMoment());
      expect(result.current).toBe('night');

      act(() => {
        vi.setSystemTime(new Date(2026, 0, 1, 17, 0, 0));
        vi.advanceTimersByTime(60 * 1000 + 500);
      });

      expect(result.current).toBe('night');
    });

    it('ignores an invalid value and falls back to the clock', () => {
      vi.stubEnv('DEV', true);
      vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
      window.history.replaceState(null, '', '/?moment=banana');

      const { result } = renderHook(() => useMoment());

      expect(result.current).toBe('day');
    });

    it('ignores the query param outside dev', () => {
      vi.stubEnv('DEV', false);
      vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
      window.history.replaceState(null, '', '/?moment=dawn');

      const { result } = renderHook(() => useMoment());

      expect(result.current).toBe('day');
    });
  });
});
