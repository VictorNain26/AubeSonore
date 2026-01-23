/**
 * Cast types for Chromecast and AirPlay integration
 *
 * Best Practices 2025/2026:
 * - Strict typing for all cast-related data
 * - Discriminated unions for connection states
 */

export type CastType = 'chromecast' | 'airplay';

export type CastConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface CastDevice {
  id: string;
  name: string;
  type: CastType;
}

export interface CastMediaMetadata {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
}

export interface CastState {
  // Availability
  chromecastAvailable: boolean;
  airplayAvailable: boolean;

  // Connection state
  connectionState: CastConnectionState;
  isCasting: boolean;
  castType: CastType | null;
  deviceName: string | null;

  // UI state
  isConnecting: boolean;
  error: string | null;
}

export interface CastActions {
  // Lifecycle
  initialize: () => Promise<void>;

  // Session control
  startChromecast: () => void;
  stopCasting: () => Promise<void>;

  // State updates (called by CastProvider)
  setCasting: (isCasting: boolean, device?: string, type?: CastType) => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  setChromecastAvailable: (available: boolean) => void;
  setAirplayAvailable: (available: boolean) => void;
  reset: () => void;
}

export type CastStore = CastState & CastActions;
