// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the entire cast lib — it references window.cast (Google Cast SDK) which
// does not exist in jsdom, and isAirPlaySupported() touches window at module load.
vi.mock('../lib/cast', () => ({
  loadCastSDK: vi.fn(),
  isCastSDKLoaded: vi.fn(() => false),
  getCastContext: vi.fn(() => null),
  getCurrentSession: vi.fn(() => null),
  initializeChromecast: vi.fn().mockResolvedValue(false),
  getRemotePlayer: vi.fn(() => null),
  getRemotePlayerController: vi.fn(() => null),
  isChromecastAvailable: vi.fn(() => false),
  isChromecastConnected: vi.fn(() => false),
  getChromecastDeviceName: vi.fn(() => null),
  requestChromecastSession: vi.fn().mockResolvedValue(undefined),
  loadChromecastMedia: vi.fn().mockResolvedValue(undefined),
  endChromecastSession: vi.fn(),
  onCastStateChanged: vi.fn(() => () => {}),
  onSessionStateChanged: vi.fn(() => () => {}),
  onChromecastConnectionChanged: vi.fn(() => () => {}),
  cleanupChromecast: vi.fn(),
  isAirPlaySupported: vi.fn(() => false),
  enableAirPlay: vi.fn(),
  isAirPlayActive: vi.fn(() => false),
  showAirPlayPicker: vi.fn(),
  onAirPlayAvailabilityChanged: vi.fn(() => () => {}),
  onAirPlayConnectionChanged: vi.fn(() => () => {}),
}));

// player.ts creates new Audio() at module level — stub it
vi.mock('../lib/player', () => ({
  getAudioElement: vi.fn(() => ({
    volume: 1,
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
  usePlayer: {
    getState: vi.fn(() => ({ stop: vi.fn() })),
  },
}));

const RESET_STATE = {
  chromecastAvailable: false,
  airplayAvailable: false,
  isCasting: false,
  castType: null,
  deviceName: null,
  isConnecting: false,
  isInitialized: false,
  error: null,
};

beforeEach(async () => {
  const { useCastStore } = await import('./castStore');
  useCastStore.setState(RESET_STATE);
});

describe('castStore state transitions', () => {
  it('starts in a clean state', async () => {
    const { useCastStore } = await import('./castStore');
    const state = useCastStore.getState();
    expect(state.isCasting).toBe(false);
    expect(state.castType).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isInitialized).toBe(false);
  });

  it('setError stores the error message', async () => {
    const { useCastStore } = await import('./castStore');
    useCastStore.getState().setError('connection lost');
    expect(useCastStore.getState().error).toBe('connection lost');
  });

  it('setError(null) clears a prior error', async () => {
    const { useCastStore } = await import('./castStore');
    useCastStore.setState({ error: 'prior error' });
    useCastStore.getState().setError(null);
    expect(useCastStore.getState().error).toBeNull();
  });

  it('reset() clears all casting state', async () => {
    const { useCastStore } = await import('./castStore');
    useCastStore.setState({
      isCasting: true,
      castType: 'chromecast',
      deviceName: 'Living Room TV',
      isConnecting: true,
      error: 'stale error',
    });
    useCastStore.getState().reset();
    const state = useCastStore.getState();
    expect(state.isCasting).toBe(false);
    expect(state.castType).toBeNull();
    expect(state.deviceName).toBeNull();
    expect(state.isConnecting).toBe(false);
    expect(state.error).toBeNull();
  });

  it('reset() does not touch availability flags or isInitialized', async () => {
    const { useCastStore } = await import('./castStore');
    useCastStore.setState({
      chromecastAvailable: true,
      airplayAvailable: true,
      isInitialized: true,
      isCasting: true,
    });
    useCastStore.getState().reset();
    const state = useCastStore.getState();
    expect(state.chromecastAvailable).toBe(true);
    expect(state.airplayAvailable).toBe(true);
    expect(state.isInitialized).toBe(true);
  });

  it('stopCasting() clears state for AirPlay session', async () => {
    const { useCastStore } = await import('./castStore');
    useCastStore.setState({
      isCasting: true,
      castType: 'airplay',
      deviceName: 'AirPlay',
      isConnecting: false,
    });
    useCastStore.getState().stopCasting();
    const state = useCastStore.getState();
    expect(state.isCasting).toBe(false);
    expect(state.castType).toBeNull();
    expect(state.deviceName).toBeNull();
    expect(state.isConnecting).toBe(false);
  });

  it('stopCasting() calls endChromecastSession for Chromecast session', async () => {
    const { useCastStore } = await import('./castStore');
    const { endChromecastSession } = await import('../lib/cast');
    useCastStore.setState({
      isCasting: true,
      castType: 'chromecast',
      deviceName: 'Kitchen Speaker',
    });
    useCastStore.getState().stopCasting();
    expect(endChromecastSession).toHaveBeenCalledOnce();
    const state = useCastStore.getState();
    expect(state.isCasting).toBe(false);
    expect(state.castType).toBeNull();
  });

  it('stopCasting() when not casting still resets state', async () => {
    const { useCastStore } = await import('./castStore');
    useCastStore.setState({ isCasting: false, castType: null });
    useCastStore.getState().stopCasting();
    const state = useCastStore.getState();
    expect(state.isCasting).toBe(false);
    expect(state.castType).toBeNull();
  });
});
