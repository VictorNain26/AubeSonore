/**
 * Google Cast module - Single source of truth for Chromecast integration
 *
 * Best Practices 2025/2026:
 * - Lazy loading of native module (avoid crash if not installed)
 * - Type-safe API with proper error handling
 * - Singleton pattern for module access
 * - Clear separation between module access and business logic
 */

import type { MediaStreamType as MediaStreamTypeEnum } from 'react-native-google-cast';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface MediaMetadata {
  type: 'musicTrack';
  title: string;
  artist: string;
  albumTitle?: string;
  images?: Array<{ url: string }>;
}

interface MediaInfo {
  contentUrl: string;
  contentType: string;
  streamType?: typeof MediaStreamTypeEnum;
  metadata?: MediaMetadata;
}

interface LoadMediaOptions {
  mediaInfo: MediaInfo;
  autoplay?: boolean;
}

interface RemoteMediaClient {
  loadMedia: (options: LoadMediaOptions) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
}

interface CastSession {
  getClient: () => Promise<RemoteMediaClient | null>;
  getCastDevice: () => Promise<{ friendlyName?: string } | null>;
  setVolume: (volume: number) => Promise<void>;
}

interface SessionManager {
  onSessionStarting: (cb: () => void) => { remove: () => void };
  onSessionStarted: (cb: () => void) => { remove: () => void };
  onSessionEnded: (cb: () => void) => { remove: () => void };
  onSessionStartFailed: (cb: (error?: Error) => void) => { remove: () => void };
  onSessionResumed: (cb: () => void) => { remove: () => void };
  getCurrentCastSession: () => Promise<CastSession | null>;
  endCurrentSession: (stopCasting: boolean) => Promise<void>;
}

interface GoogleCastModule {
  showCastDialog: () => Promise<boolean>;
  getCastState: () => Promise<CastState>;
  showExpandedControls: () => void;
  getSessionManager: () => SessionManager;
  getClient: () => Promise<RemoteMediaClient | null>;
}

export enum CastState {
  NO_DEVICES_AVAILABLE = 'noDevicesAvailable',
  NOT_CONNECTED = 'notConnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

// ─────────────────────────────────────────────
// Module Singleton
// ─────────────────────────────────────────────

let googleCastModule: GoogleCastModule | null = null;
let loadAttempted = false;

/**
 * Lazily load the Google Cast native module
 * Returns null if not available (dev client without native module)
 */
function loadModule(): GoogleCastModule | null {
  if (loadAttempted) {
    return googleCastModule;
  }

  loadAttempted = true;

  try {
    const module = require('react-native-google-cast').default;
    if (module?.showCastDialog && module?.getSessionManager) {
      googleCastModule = module;
    }
  } catch {
    // Native module not available - this is expected in Expo Go
    console.log('[Cast] Native module not available');
  }

  return googleCastModule;
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Get the Google Cast module if available
 */
export function getGoogleCast(): GoogleCastModule | null {
  return loadModule();
}

/**
 * Check if Google Cast is available
 */
export function isCastAvailable(): boolean {
  return loadModule() !== null;
}

/**
 * Show the native cast device picker
 */
export async function showCastPicker(): Promise<boolean> {
  const cast = loadModule();
  if (!cast) return false;

  try {
    return await cast.showCastDialog();
  } catch (error) {
    console.warn('[Cast] Failed to show picker:', error);
    return false;
  }
}

/**
 * Get current cast state
 */
export async function getCastState(): Promise<CastState | null> {
  const cast = loadModule();
  if (!cast) return null;

  try {
    return await cast.getCastState();
  } catch {
    return null;
  }
}

/**
 * Get the session manager for event subscriptions
 */
export function getSessionManager(): SessionManager | null {
  const cast = loadModule();
  if (!cast) return null;

  try {
    return cast.getSessionManager();
  } catch {
    return null;
  }
}

/**
 * Get the current cast session
 */
export async function getCurrentSession(): Promise<CastSession | null> {
  const sessionManager = getSessionManager();
  if (!sessionManager) return null;

  try {
    return await sessionManager.getCurrentCastSession();
  } catch {
    return null;
  }
}

/**
 * Get the remote media client for controlling playback
 */
export async function getRemoteMediaClient(): Promise<RemoteMediaClient | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  try {
    return await session.getClient();
  } catch {
    return null;
  }
}

/**
 * Load media to the cast device
 */
export async function loadMedia(
  contentUrl: string,
  metadata: {
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string;
  }
): Promise<boolean> {
  const client = await getRemoteMediaClient();
  if (!client) return false;

  try {
    await client.loadMedia({
      mediaInfo: {
        contentUrl,
        contentType: 'audio/mpeg',
        metadata: {
          type: 'musicTrack',
          title: metadata.title,
          artist: metadata.artist,
          albumTitle: metadata.album,
          images: metadata.artworkUrl ? [{ url: metadata.artworkUrl }] : undefined,
        },
      },
      autoplay: true,
    });
    return true;
  } catch (error) {
    console.warn('[Cast] Failed to load media:', error);
    return false;
  }
}

/**
 * Control playback on cast device
 */
export async function play(): Promise<boolean> {
  const client = await getRemoteMediaClient();
  if (!client) return false;

  try {
    await client.play();
    return true;
  } catch {
    return false;
  }
}

export async function pause(): Promise<boolean> {
  const client = await getRemoteMediaClient();
  if (!client) return false;

  try {
    await client.pause();
    return true;
  } catch {
    return false;
  }
}

export async function stop(): Promise<boolean> {
  const client = await getRemoteMediaClient();
  if (!client) return false;

  try {
    await client.stop();
    return true;
  } catch {
    return false;
  }
}

/**
 * Set volume on cast device (0-1)
 */
export async function setVolume(volume: number): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;

  try {
    const clamped = Math.max(0, Math.min(1, volume));
    await session.setVolume(clamped);
    return true;
  } catch {
    return false;
  }
}

/**
 * End the current cast session
 */
export async function endSession(): Promise<boolean> {
  const sessionManager = getSessionManager();
  if (!sessionManager) return false;

  try {
    await sessionManager.endCurrentSession(true);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get connected device name
 */
export async function getConnectedDeviceName(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  try {
    const device = await session.getCastDevice();
    return device?.friendlyName ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if currently casting
 */
export async function isCasting(): Promise<boolean> {
  const state = await getCastState();
  return state === CastState.CONNECTED;
}
