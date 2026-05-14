// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockAudio {
  src = '';
  volume = 1;
  preload = 'none';
  crossOrigin = 'anonymous';
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  setAttribute = vi.fn();
  addEventListener = vi.fn();
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
  vi.stubGlobal(
    'AudioContext',

    vi.fn().mockImplementation(function () {
      return {
        createAnalyser: () => ({ connect: vi.fn(), fftSize: 0, smoothingTimeConstant: 0 }),
        createMediaElementSource: () => ({ connect: vi.fn() }),
        state: 'running',
        resume: vi.fn(),
        destination: {},
      };
    })
  );
});

describe('player store', () => {
  it('sets isPlaying true on successful play()', async () => {
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    expect(usePlayer.getState().isPlaying).toBe(true);
    expect(usePlayer.getState().playError).toBeNull();
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
});
