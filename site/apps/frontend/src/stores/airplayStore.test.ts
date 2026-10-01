import { describe, it, expect, vi, beforeEach } from 'vitest';

const listeners: {
  availability?: (available: boolean) => void;
  connection?: (isWireless: boolean) => void;
} = {};

const mockAudio = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as unknown;

vi.mock('../lib/cast/airplay', () => ({
  isAirPlaySupported: () => true,
  showAirPlayPicker: vi.fn(),
  onAirPlayAvailabilityChanged: (_audio: unknown, cb: (a: boolean) => void) => {
    listeners.availability = cb;
    return () => {};
  },
  onAirPlayConnectionChanged: (_audio: unknown, cb: (w: boolean) => void) => {
    listeners.connection = cb;
    return () => {};
  },
}));

vi.mock('../lib/player', () => ({
  getAudioElement: () => mockAudio,
}));

import { useAirPlayStore } from './airplayStore';

describe('airplayStore', () => {
  beforeEach(() => {
    useAirPlayStore.setState({ available: false, isActive: false });
    useAirPlayStore.getState().initialize();
  });

  it('reflects availability events', () => {
    listeners.availability?.(true);
    expect(useAirPlayStore.getState().available).toBe(true);
    listeners.availability?.(false);
    expect(useAirPlayStore.getState().available).toBe(false);
  });

  it('reflects connection events', () => {
    listeners.connection?.(true);
    expect(useAirPlayStore.getState().isActive).toBe(true);
    listeners.connection?.(false);
    expect(useAirPlayStore.getState().isActive).toBe(false);
  });
});
