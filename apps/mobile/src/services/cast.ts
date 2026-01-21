/**
 * Cast service for Chromecast integration
 * Provides abstraction layer for casting functionality
 */

import GoogleCast, {
  CastState,
  MediaInfo,
  MediaPlayerState,
  MediaStreamType,
} from 'react-native-google-cast';
import { STREAM_URL } from '../config/env';
import type { CastMediaMetadata } from '../types/cast';

// Default Media Receiver App ID (provided by Google)
const DEFAULT_MEDIA_RECEIVER_APP_ID = 'CC1AD845';

// Audio stream MIME type
const AUDIO_CONTENT_TYPE = 'audio/mpeg';

/**
 * Initialize Google Cast SDK
 * Should be called once at app startup
 */
export function initializeCast(): void {
  // Google Cast is automatically initialized by the native module
  // This function exists for future customization if needed
  console.log('[Cast] Google Cast SDK initialized');
}

/**
 * Get the current cast state
 */
export async function getCastState(): Promise<CastState | null> {
  try {
    return await GoogleCast.getCastState();
  } catch {
    return null;
  }
}

/**
 * Show the cast device picker (native UI)
 */
export async function showCastPicker(): Promise<boolean> {
  return GoogleCast.showCastDialog();
}

/**
 * Show the expanded controller
 */
export function showExpandedController(): void {
  GoogleCast.showExpandedControls();
}

/**
 * Get the session manager
 */
export function getSessionManager() {
  return GoogleCast.getSessionManager();
}

/**
 * Get the current cast session
 */
export async function getCurrentSession() {
  return GoogleCast.getSessionManager().getCurrentCastSession();
}

/**
 * Get the remote media client for the current session
 */
export async function getRemoteMediaClient() {
  const session = await getCurrentSession();
  if (!session) return null;
  return session.getClient();
}

/**
 * Load media to the cast device
 */
export async function loadMedia(metadata: CastMediaMetadata): Promise<void> {
  const client = await getRemoteMediaClient();
  if (!client) {
    throw new Error('No active cast session');
  }

  // Create media info for audio stream
  const mediaInfo: MediaInfo = {
    contentUrl: STREAM_URL,
    contentType: AUDIO_CONTENT_TYPE,
    streamType: MediaStreamType.LIVE, // Radio is a live stream
    metadata: {
      type: 'musicTrack',
      title: metadata.title,
      artist: metadata.artist,
      albumTitle: metadata.album,
      images: metadata.artworkUrl
        ? [{ url: metadata.artworkUrl }]
        : undefined,
    },
  };

  // Load and autoplay
  await client.loadMedia({
    mediaInfo,
    autoplay: true,
  });
}

/**
 * Play media on cast device
 */
export async function play(): Promise<void> {
  const client = await getRemoteMediaClient();
  if (!client) return;
  await client.play();
}

/**
 * Pause media on cast device
 */
export async function pause(): Promise<void> {
  const client = await getRemoteMediaClient();
  if (!client) return;
  await client.pause();
}

/**
 * Stop media on cast device
 */
export async function stop(): Promise<void> {
  const client = await getRemoteMediaClient();
  if (!client) return;
  await client.stop();
}

/**
 * Set volume on cast device (0-1)
 */
export async function setVolume(volume: number): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const clampedVolume = Math.max(0, Math.min(1, volume));
  await session.setVolume(clampedVolume);
}

/**
 * End the current cast session
 */
export async function endSession(): Promise<void> {
  await GoogleCast.getSessionManager().endCurrentSession(true);
}

/**
 * Check if currently casting
 */
export async function isCasting(): Promise<boolean> {
  const state = await getCastState();
  return state === CastState.CONNECTED;
}

/**
 * Get the connected device name
 */
export async function getConnectedDeviceName(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const device = await session.getCastDevice();
  return device?.friendlyName ?? null;
}

// Re-export types and constants for convenience
export { CastState, MediaPlayerState };
export { DEFAULT_MEDIA_RECEIVER_APP_ID };
