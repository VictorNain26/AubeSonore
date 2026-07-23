// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type AudioListener = (e?: Event) => void;

class MockAudio {
  src = '';
  volume = 1;
  preload = 'none';
  crossOrigin = 'anonymous';
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  setAttribute = vi.fn();
  private listeners: Record<string, AudioListener[]> = {};
  addEventListener = vi.fn((event: string, cb: AudioListener) => {
    (this.listeners[event] ??= []).push(cb);
  });
  emit(event: string) {
    (this.listeners[event] ?? []).forEach((cb) => cb());
  }
}

let mockAudioInstance: MockAudio;

beforeEach(() => {
  vi.resetModules();
  mockAudioInstance = new MockAudio();
  vi.stubGlobal(
    'Audio',
    vi.fn().mockImplementation(function () {
      return mockAudioInstance;
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('player store', () => {
  it('sets isPlaying true on successful play()', async () => {
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    expect(usePlayer.getState().isPlaying).toBe(true);
    expect(usePlayer.getState().playError).toBeNull();
  });

  it('play() never routes audio through Web Audio (keeps iOS lock-screen playback alive)', async () => {
    // Regression guard for the locked-screen silence bug: routing the stream
    // through createMediaElementSource makes the AudioContext the sole output,
    // and iOS suspends it seconds after lock (WebKit #231105). The player must
    // stay on the bare <audio> element.
    const AudioContextSpy = vi.fn();
    vi.stubGlobal('AudioContext', AudioContextSpy);
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    expect(usePlayer.getState().isPlaying).toBe(true);
    expect(AudioContextSpy).not.toHaveBeenCalled();
  });

  it('does NOT set playError on AbortError (double-click race)', async () => {
    const abort = new Error('Aborted');
    abort.name = 'AbortError';
    mockAudioInstance.play.mockRejectedValueOnce(abort);
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    expect(usePlayer.getState().isPlaying).toBe(false);
    expect(usePlayer.getState().playError).toBeNull();
  });

  it('sets playError on network failure', async () => {
    mockAudioInstance.play.mockRejectedValueOnce(new Error('Network down'));
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    const err = usePlayer.getState().playError;
    expect(err?.message).toContain('Network down');
  });

  it('stop() clears isPlaying and playError', async () => {
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    usePlayer.getState().stop();
    expect(usePlayer.getState().isPlaying).toBe(false);
    expect(usePlayer.getState().playError).toBeNull();
  });

  it('setVolume clamps to [0, 1]', async () => {
    const { usePlayer } = await import('./player');
    usePlayer.getState().setVolume(1.5);
    expect(usePlayer.getState().volume).toBe(1);
    usePlayer.getState().setVolume(-0.5);
    expect(usePlayer.getState().volume).toBe(0);
  });

  it('toggleMute restores the pre-mute volume', async () => {
    const { usePlayer } = await import('./player');
    usePlayer.getState().setVolume(0.4);
    usePlayer.getState().toggleMute();
    expect(usePlayer.getState().volume).toBe(0);
    usePlayer.getState().toggleMute();
    expect(usePlayer.getState().volume).toBe(0.4);
  });

  it('toggleMute falls back to 0.5 when the pre-mute volume was 0', async () => {
    const { usePlayer } = await import('./player');
    usePlayer.getState().setVolume(0);
    expect(usePlayer.getState().isMuted).toBe(true);
    usePlayer.getState().toggleMute();
    expect(usePlayer.getState().volume).toBe(0.5);
    expect(usePlayer.getState().isMuted).toBe(false);
  });

  it('dragging the slider up after a mute clears isMuted', async () => {
    const { usePlayer } = await import('./player');
    usePlayer.getState().setVolume(0.8);
    usePlayer.getState().toggleMute();
    usePlayer.getState().setVolume(0.5);
    expect(usePlayer.getState().isMuted).toBe(false);
    expect(usePlayer.getState().volume).toBe(0.5);
  });
});

describe('player resilience (stream auto-recovery)', () => {
  it("reconnects when the live stream emits 'ended'", async () => {
    vi.useFakeTimers();
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    const callsBefore = mockAudioInstance.play.mock.calls.length;
    mockAudioInstance.emit('ended');
    // First backoff slot is 500ms
    await vi.advanceTimersByTimeAsync(600);
    expect(mockAudioInstance.play.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("reconnects when the audio element emits 'error'", async () => {
    vi.useFakeTimers();
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    const callsBefore = mockAudioInstance.play.mock.calls.length;
    mockAudioInstance.emit('error');
    await vi.advanceTimersByTimeAsync(600);
    expect(mockAudioInstance.play.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("forces reconnect after sustained 'waiting' (>1.5s without 'playing')", async () => {
    vi.useFakeTimers();
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    const callsBefore = mockAudioInstance.play.mock.calls.length;
    mockAudioInstance.emit('waiting');
    // Grace period 1.5s + first backoff 500ms = 2s
    await vi.advanceTimersByTimeAsync(2_100);
    expect(mockAudioInstance.play.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("does NOT reconnect if 'playing' fires before the stall timer", async () => {
    vi.useFakeTimers();
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    const callsBefore = mockAudioInstance.play.mock.calls.length;
    mockAudioInstance.emit('waiting');
    await vi.advanceTimersByTimeAsync(500); // mid-grace
    mockAudioInstance.emit('playing'); // buffer refilled
    await vi.advanceTimersByTimeAsync(3_000); // way past where reconnect would have fired
    expect(mockAudioInstance.play.mock.calls.length).toBe(callsBefore);
  });

  it('stop() cancels pending auto-recovery', async () => {
    vi.useFakeTimers();
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    const callsBefore = mockAudioInstance.play.mock.calls.length;
    mockAudioInstance.emit('ended');
    usePlayer.getState().stop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(mockAudioInstance.play.mock.calls.length).toBe(callsBefore);
  });
});
