/**
 * Chromecast Service
 *
 * Based on official documentation:
 * https://developers.google.com/cast/docs/web_sender/integrate
 *
 * Uses RemotePlayer and RemotePlayerController pattern
 * for proper state synchronization with receiver
 */

import { loadCastSDK, getCastContext, getCurrentSession, isCastSDKLoaded } from './loader';
import type { CastMediaMetadata } from '../../types/cast';

// Default Media Receiver (no registration required)
// https://developers.google.com/cast/docs/web_sender#registering_your_application
const DEFAULT_MEDIA_RECEIVER_APP_ID = 'CC1AD845';

// HLS MIME type for live streams
const HLS_CONTENT_TYPE = 'application/x-mpegurl';

// Stream URL from env
const STREAM_URL =
  import.meta.env.VITE_STREAM_URL || 'https://radio.aubesonore.fr/hls/aubesonore/live.m3u8';

// Singleton state on window for HMR safety
const STATE_KEY = '__CHROMECAST_STATE__';

interface ChromecastState {
  initialized: boolean;
  remotePlayer: cast.framework.RemotePlayer | null;
  remotePlayerController: cast.framework.RemotePlayerController | null;
  eventCleanups: Set<() => void>;
}

declare global {
  interface Window {
    [STATE_KEY]?: ChromecastState;
  }
}

function getState(): ChromecastState {
  if (!window[STATE_KEY]) {
    window[STATE_KEY] = {
      initialized: false,
      remotePlayer: null,
      remotePlayerController: null,
      eventCleanups: new Set(),
    };
  }
  return window[STATE_KEY];
}

function registerCleanup(cleanup: () => void): () => void {
  const state = getState();
  const wrapped = () => {
    cleanup();
    state.eventCleanups.delete(wrapped);
  };
  state.eventCleanups.add(wrapped);
  return wrapped;
}

/**
 * Initialize Chromecast
 * Sets up CastContext options and RemotePlayer
 */
export async function initializeChromecast(): Promise<boolean> {
  const state = getState();

  if (state.initialized) {
    return true;
  }

  try {
    await loadCastSDK();

    const context = getCastContext();
    if (!context) {
      console.warn('[Chromecast] Context not available');
      return false;
    }

    // Configure cast options (per documentation)
    context.setOptions({
      receiverApplicationId: DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });

    // Create RemotePlayer and Controller (official pattern)
    state.remotePlayer = new cast.framework.RemotePlayer();
    state.remotePlayerController = new cast.framework.RemotePlayerController(state.remotePlayer);

    state.initialized = true;
    console.log('[Chromecast] Initialized with RemotePlayer');
    return true;
  } catch (error) {
    console.error('[Chromecast] Initialization failed:', error);
    return false;
  }
}

/**
 * Get RemotePlayer instance
 */
export function getRemotePlayer(): cast.framework.RemotePlayer | null {
  return getState().remotePlayer;
}

/**
 * Get RemotePlayerController instance
 */
export function getRemotePlayerController(): cast.framework.RemotePlayerController | null {
  return getState().remotePlayerController;
}

/**
 * Check if Chromecast devices are available
 */
export function isChromecastAvailable(): boolean {
  if (!isCastSDKLoaded()) return false;
  const context = getCastContext();
  if (!context) return false;
  const castState = context.getCastState();
  return castState !== cast.framework.CastState.NO_DEVICES_AVAILABLE;
}

/**
 * Check if currently connected to a Cast device
 */
export function isConnected(): boolean {
  const player = getRemotePlayer();
  return player?.isConnected ?? false;
}

/**
 * Get connected device name
 */
export function getDeviceName(): string | null {
  const session = getCurrentSession();
  return session?.getCastDevice()?.friendlyName ?? null;
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

  // Create MediaInfo for live HLS stream
  const mediaInfo = new chrome.cast.media.MediaInfo(STREAM_URL, HLS_CONTENT_TYPE);
  mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;

  // Create music metadata
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

  // Create and execute load request
  const loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
  loadRequest.autoplay = true;

  await session.loadMedia(loadRequest);
}

/**
 * End current session
 * @param stopCasting - If true, stops casting on all devices
 */
export function endSession(stopCasting = true): void {
  const session = getCurrentSession();
  if (session) {
    session.endSession(stopCasting);
  }
}

// Event subscription types
type CastStateCallback = (state: cast.framework.CastState) => void;
type SessionStateCallback = (state: cast.framework.SessionState) => void;
type ConnectionCallback = (isConnected: boolean) => void;

/**
 * Subscribe to cast state changes (device availability)
 */
export function onCastStateChanged(callback: CastStateCallback): () => void {
  const context = getCastContext();
  if (!context) return () => {};

  const listener = (event: cast.framework.CastStateEventData) => {
    callback(event.castState);
  };

  context.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);

  return registerCleanup(() => {
    context.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);
  });
}

/**
 * Subscribe to session state changes
 */
export function onSessionStateChanged(callback: SessionStateCallback): () => void {
  const context = getCastContext();
  if (!context) return () => {};

  const listener = (event: cast.framework.SessionStateEventData) => {
    callback(event.sessionState);
  };

  context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, listener);

  return registerCleanup(() => {
    context.removeEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      listener
    );
  });
}

/**
 * Subscribe to connection state changes (via RemotePlayerController)
 * This is the recommended way per Google documentation
 */
export function onConnectionChanged(callback: ConnectionCallback): () => void {
  const controller = getRemotePlayerController();
  const player = getRemotePlayer();
  if (!controller || !player) return () => {};

  const listener = () => {
    callback(player.isConnected);
  };

  controller.addEventListener(cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED, listener);

  return registerCleanup(() => {
    controller.removeEventListener(
      cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
      listener
    );
  });
}

/**
 * Clean up all event listeners (snapshot first so wrapped.delete during fn() is safe).
 */
export function cleanup(): void {
  const state = getState();
  const fns = Array.from(state.eventCleanups);
  state.eventCleanups.clear();
  for (const fn of fns) fn();
}
