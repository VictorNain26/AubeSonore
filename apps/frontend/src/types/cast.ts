/**
 * Cast types for Chromecast and AirPlay integration (Web)
 */

export type CastType = 'chromecast' | 'airplay';

export type CastConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected';

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

export {};
