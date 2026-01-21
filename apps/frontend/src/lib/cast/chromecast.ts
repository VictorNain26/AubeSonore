/**
 * Chromecast service for web
 * Wrapper around Google Cast Web Sender API
 */

// Type imports for Google Cast SDK (ambient types from google-cast.d.ts)

import { loadCastSDK, getCastContext, isCastSDKLoaded } from './loader';
import type { CastMediaMetadata } from '../../types/cast';

// Default Media Receiver App ID (provided by Google)
const DEFAULT_MEDIA_RECEIVER_APP_ID = 'CC1AD845';

// HLS MIME type
const HLS_CONTENT_TYPE = 'application/x-mpegurl';

// Stream URL
const STREAM_URL =
  import.meta.env.VITE_STREAM_URL || 'https://radio.aubesonore.fr/hls/aubesonore/live.m3u8';

let isInitialized = false;

/**
 * Initialize Chromecast
 */
export async function initializeChromecast(): Promise<void> {
  if (isInitialized) return;

  try {
    await loadCastSDK();

    const context = getCastContext();
    if (!context) {
      console.warn('[Chromecast] Context not available');
      return;
    }

    // Configure cast options
    context.setOptions({
      receiverApplicationId: DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });

    isInitialized = true;
    console.log('[Chromecast] Initialized');
  } catch (error) {
    console.error('[Chromecast] Initialization failed:', error);
  }
}

/**
 * Get current cast state
 */
export function getCastState(): cast.framework.CastState | null {
  const context = getCastContext();
  if (!context) return null;
  return context.getCastState();
}

/**
 * Get current session
 */
export function getCurrentSession(): cast.framework.CastSession | null {
  const context = getCastContext();
  if (!context) return null;
  return context.getCurrentSession();
}

/**
 * Check if casting is available
 */
export function isChromecastAvailable(): boolean {
  if (!isCastSDKLoaded()) return false;
  const state = getCastState();
  return state !== null && state !== cast.framework.CastState.NO_DEVICES_AVAILABLE;
}

/**
 * Check if currently casting
 */
export function isCasting(): boolean {
  const session = getCurrentSession();
  return (
    session !== null && session.getSessionState() === cast.framework.SessionState.SESSION_STARTED
  );
}

/**
 * Get connected device name
 */
export function getConnectedDeviceName(): string | null {
  const session = getCurrentSession();
  if (!session) return null;
  return session.getCastDevice()?.friendlyName ?? null;
}

/**
 * Request a cast session (opens device picker)
 */
export async function requestSession(): Promise<void> {
  const context = getCastContext();
  if (!context) {
    throw new Error('Cast context not available');
  }

  await context.requestSession();
}

/**
 * Load media to cast device
 */
export async function loadMedia(metadata: CastMediaMetadata): Promise<void> {
  const session = getCurrentSession();
  if (!session) {
    throw new Error('No active cast session');
  }

  // Create media info
  const mediaInfo = new chrome.cast.media.MediaInfo(STREAM_URL, HLS_CONTENT_TYPE);
  mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;

  // Create metadata
  const castMetadata = new chrome.cast.media.MusicTrackMediaMetadata();
  castMetadata.title = metadata.title;
  castMetadata.artist = metadata.artist;
  if (metadata.album) {
    castMetadata.albumName = metadata.album;
  }
  if (metadata.artworkUrl) {
    castMetadata.images = [new chrome.cast.Image(metadata.artworkUrl)];
  }

  mediaInfo.metadata = castMetadata;

  // Create load request
  const loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
  loadRequest.autoplay = true;

  // Load media
  await session.loadMedia(loadRequest);
}

/**
 * End current session
 */
export function endSession(): void {
  const session = getCurrentSession();
  if (session) {
    session.endSession(true);
  }
}

/**
 * Subscribe to cast state changes
 */
export function onCastStateChanged(
  callback: (state: cast.framework.CastState) => void
): () => void {
  const context = getCastContext();
  if (!context) return () => {};

  const listener = (event: cast.framework.CastStateEventData) => {
    callback(event.castState);
  };

  context.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);

  return () => {
    context.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);
  };
}

/**
 * Subscribe to session state changes
 */
export function onSessionStateChanged(
  callback: (state: cast.framework.SessionState) => void
): () => void {
  const context = getCastContext();
  if (!context) return () => {};

  const listener = (event: cast.framework.SessionStateEventData) => {
    callback(event.sessionState);
  };

  context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, listener);

  return () => {
    context.removeEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      listener
    );
  };
}
