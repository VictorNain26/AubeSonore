// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// player.ts creates new Audio() at module level — stub before any import.
// Must use the function keyword so vitest treats the mock as a constructor.
beforeEach(() => {
  vi.stubGlobal(
    'Audio',
    vi.fn().mockImplementation(function (this: Record<string, unknown>) {
      this.src = '';
      this.volume = 1;
      this.preload = 'none';
      this.crossOrigin = 'anonymous';
      this.play = vi.fn().mockResolvedValue(undefined);
      this.pause = vi.fn();
      this.load = vi.fn();
      this.setAttribute = vi.fn();
      this.addEventListener = vi.fn();
    })
  );
  vi.stubGlobal(
    'AudioContext',
    vi.fn().mockImplementation(function (this: Record<string, unknown>) {
      this.createAnalyser = () => ({ connect: vi.fn(), fftSize: 0, smoothingTimeConstant: 0 });
      this.createMediaElementSource = () => ({ connect: vi.fn() });
      this.state = 'running';
      this.resume = vi.fn();
      this.destination = {};
    })
  );
  vi.resetModules();
});

describe('sleepTimerStore', () => {
  it('starts with isActive false and mode null', async () => {
    const { useSleepTimer } = await import('./sleepTimerStore');
    const state = useSleepTimer.getState();
    expect(state.isActive).toBe(false);
    expect(state.mode).toBeNull();
    expect(state.remainingMs).toBe(0);
    expect(state.isFadingOut).toBe(false);
  });

  it('start(N) sets isActive true and mode to timer', async () => {
    vi.useFakeTimers();
    const { useSleepTimer } = await import('./sleepTimerStore');
    useSleepTimer.getState().start(5);
    const state = useSleepTimer.getState();
    expect(state.isActive).toBe(true);
    expect(state.mode).toBe('timer');
    expect(state.remainingMs).toBe(5 * 60_000);
    vi.useRealTimers();
  });

  it('cancel() after start() resets to inactive', async () => {
    vi.useFakeTimers();
    const { useSleepTimer } = await import('./sleepTimerStore');
    useSleepTimer.getState().start(10);
    useSleepTimer.getState().cancel();
    const state = useSleepTimer.getState();
    expect(state.isActive).toBe(false);
    expect(state.mode).toBeNull();
    expect(state.remainingMs).toBe(0);
    vi.useRealTimers();
  });

  it('startEndOfTrack() sets isActive true and mode to end-of-track', async () => {
    const { useSleepTimer } = await import('./sleepTimerStore');
    useSleepTimer.getState().startEndOfTrack();
    const state = useSleepTimer.getState();
    expect(state.isActive).toBe(true);
    expect(state.mode).toBe('end-of-track');
  });

  it('triggerEndOfTrack() when active in end-of-track mode resets state', async () => {
    const { useSleepTimer } = await import('./sleepTimerStore');
    useSleepTimer.getState().startEndOfTrack();
    useSleepTimer.getState().triggerEndOfTrack();
    const state = useSleepTimer.getState();
    expect(state.isActive).toBe(false);
    expect(state.mode).toBeNull();
  });

  it('triggerEndOfTrack() is a no-op when not in end-of-track mode', async () => {
    vi.useFakeTimers();
    const { useSleepTimer } = await import('./sleepTimerStore');
    useSleepTimer.getState().start(3);
    useSleepTimer.getState().triggerEndOfTrack();
    // Still active (timer mode was not cleared)
    expect(useSleepTimer.getState().isActive).toBe(true);
    expect(useSleepTimer.getState().mode).toBe('timer');
    vi.useRealTimers();
  });

  it('tick() decrements remainingMs and sets isFadingOut near the end', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const { useSleepTimer } = await import('./sleepTimerStore');
    useSleepTimer.getState().start(1); // 60 000 ms

    // Advance to 25 seconds remaining (< 30s fade threshold)
    vi.setSystemTime(now + 35_000);
    useSleepTimer.getState().tick();

    expect(useSleepTimer.getState().isFadingOut).toBe(true);
    vi.useRealTimers();
  });
});
