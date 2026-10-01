// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBannerSlot } from './bannerSlotStore';

describe('useBannerSlot', () => {
  it('returns false when want is false', () => {
    const { result } = renderHook(() => useBannerSlot('pwa', 1, false));
    expect(result.current).toBe(false);
  });

  it('returns true when want is true and no other claim is active', () => {
    const { result } = renderHook(() => useBannerSlot('pwa', 1, true));
    expect(result.current).toBe(true);
  });

  it('higher priority claim wins over a lower priority one', () => {
    const low = renderHook(() => useBannerSlot('pwa', 1, true));
    const high = renderHook(() => useBannerSlot('push', 2, true));

    expect(high.result.current).toBe(true);
    expect(low.result.current).toBe(false);
  });

  it('lower priority claim becomes active once the higher one stops wanting the slot', () => {
    const low = renderHook(() => useBannerSlot('pwa', 1, true));
    const high = renderHook(({ want }: { want: boolean }) => useBannerSlot('push', 2, want), {
      initialProps: { want: true },
    });

    expect(high.result.current).toBe(true);
    expect(low.result.current).toBe(false);

    high.rerender({ want: false });

    expect(high.result.current).toBe(false);
    expect(low.result.current).toBe(true);
  });

  it('releases the claim on unmount, freeing the slot for the remaining claimant', () => {
    const low = renderHook(() => useBannerSlot('pwa', 1, true));
    const high = renderHook(() => useBannerSlot('push', 2, true));

    expect(high.result.current).toBe(true);
    expect(low.result.current).toBe(false);

    high.unmount();

    expect(low.result.current).toBe(true);
  });

  it('re-claims the slot when priority changes while want stays true', () => {
    const other = renderHook(() => useBannerSlot('push', 2, true));
    const changing = renderHook(
      ({ priority }: { priority: number }) => useBannerSlot('pwa', priority, true),
      { initialProps: { priority: 1 } }
    );

    expect(changing.result.current).toBe(false);
    expect(other.result.current).toBe(true);

    changing.rerender({ priority: 3 });

    expect(changing.result.current).toBe(true);
    expect(other.result.current).toBe(false);
  });
});
