/**
 * Cast types for Chromecast integration
 */

export type CastConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface CastState {
  // Availability
  chromecastAvailable: boolean;

  // Connection state
  connectionState: CastConnectionState;
  isCasting: boolean;
  deviceName: string | null;

  // Resume state
  wasPlayingBeforeCast: boolean;

  // UI state
  isConnecting: boolean;
  error: string | null;
}

export interface CastActions {
  // Session control
  stopCasting: () => Promise<void>;

  // State updates (called by CastProvider)
  setCasting: (isCasting: boolean, device?: string) => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  setChromecastAvailable: (available: boolean) => void;
  setWasPlayingBeforeCast: (value: boolean) => void;
  reset: () => void;
}

export type CastStore = CastState & CastActions;
