/**
 * Google Cast SDK Type Declarations
 * Types for the Cast Web Sender SDK (Framework API)
 *
 * Based on official documentation:
 * https://developers.google.com/cast/docs/reference/web_sender
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  namespace chrome.cast {
    const AutoJoinPolicy: {
      TAB_AND_ORIGIN_SCOPED: string;
      ORIGIN_SCOPED: string;
      PAGE_SCOPED: string;
    };

    class Image {
      constructor(url: string);
      url: string;
      height?: number;
      width?: number;
    }

    namespace media {
      const DEFAULT_MEDIA_RECEIVER_APP_ID: string;

      const StreamType: {
        BUFFERED: string;
        LIVE: string;
        OTHER: string;
      };

      class MediaInfo {
        constructor(contentId: string, contentType: string);
        contentId: string;
        contentType: string;
        streamType: string;
        metadata?: MusicTrackMediaMetadata | GenericMediaMetadata;
        duration?: number;
      }

      class MusicTrackMediaMetadata {
        type: number;
        title?: string;
        artist?: string;
        albumName?: string;
        images?: chrome.cast.Image[];
      }

      class GenericMediaMetadata {
        type: number;
        title?: string;
        subtitle?: string;
        images?: chrome.cast.Image[];
      }

      class LoadRequest {
        constructor(mediaInfo: MediaInfo);
        mediaInfo: MediaInfo;
        autoplay: boolean;
        currentTime?: number;
      }
    }
  }

  namespace cast.framework {
    // Cast State enum
    const CastState: {
      NO_DEVICES_AVAILABLE: CastState;
      NOT_CONNECTED: CastState;
      CONNECTING: CastState;
      CONNECTED: CastState;
    };

    type CastState = 'NO_DEVICES_AVAILABLE' | 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED';

    // Session State enum
    const SessionState: {
      NO_SESSION: SessionState;
      SESSION_STARTING: SessionState;
      SESSION_STARTED: SessionState;
      SESSION_START_FAILED: SessionState;
      SESSION_ENDING: SessionState;
      SESSION_ENDED: SessionState;
      SESSION_RESUMED: SessionState;
    };

    type SessionState =
      | 'NO_SESSION'
      | 'SESSION_STARTING'
      | 'SESSION_STARTED'
      | 'SESSION_START_FAILED'
      | 'SESSION_ENDING'
      | 'SESSION_ENDED'
      | 'SESSION_RESUMED';

    // Event Types
    const CastContextEventType: {
      CAST_STATE_CHANGED: string;
      SESSION_STATE_CHANGED: string;
    };

    const RemotePlayerEventType: {
      ANY_CHANGE: string;
      IS_CONNECTED_CHANGED: string;
      IS_MEDIA_LOADED_CHANGED: string;
      DURATION_CHANGED: string;
      CURRENT_TIME_CHANGED: string;
      IS_PAUSED_CHANGED: string;
      VOLUME_LEVEL_CHANGED: string;
      IS_MUTED_CHANGED: string;
      CAN_PAUSE_CHANGED: string;
      CAN_SEEK_CHANGED: string;
      DISPLAY_NAME_CHANGED: string;
      STATUS_TEXT_CHANGED: string;
      TITLE_CHANGED: string;
      DISPLAY_STATUS_CHANGED: string;
      MEDIA_INFO_CHANGED: string;
      IMAGE_URL_CHANGED: string;
      PLAYER_STATE_CHANGED: string;
    };

    // Options interfaces
    interface CastOptions {
      receiverApplicationId: string;
      autoJoinPolicy?: string;
      language?: string;
      resumeSavedSession?: boolean;
    }

    // Event data interfaces
    interface CastStateEventData {
      castState: CastState;
    }

    interface SessionStateEventData {
      sessionState: SessionState;
      session?: CastSession;
      errorCode?: string;
    }

    interface RemotePlayerChangedEvent {
      field: string;
      value: any;
    }

    // Device interface
    interface CastDevice {
      deviceId: string;
      friendlyName: string;
      capabilities: number;
    }

    // Session class
    class CastSession {
      getCastDevice(): CastDevice | null;
      getSessionState(): SessionState;
      loadMedia(loadRequest: chrome.cast.media.LoadRequest): Promise<void>;
      endSession(stopCasting: boolean): void;
      getMediaSession(): any;
    }

    // Context class (singleton)
    class CastContext {
      static getInstance(): CastContext;
      setOptions(options: CastOptions): void;
      getCastState(): CastState;
      getCurrentSession(): CastSession | null;
      requestSession(): Promise<void>;
      addEventListener(type: string, handler: (event: any) => void): void;
      removeEventListener(type: string, handler: (event: any) => void): void;
    }

    /**
     * RemotePlayer - Holds player state synchronized with receiver
     * https://developers.google.com/cast/docs/reference/web_sender/cast.framework.RemotePlayer
     */
    class RemotePlayer {
      isConnected: boolean;
      isMediaLoaded: boolean;
      duration: number;
      currentTime: number;
      isPaused: boolean;
      volumeLevel: number;
      isMuted: boolean;
      canPause: boolean;
      canSeek: boolean;
      displayName: string;
      statusText: string;
      title: string;
      displayStatus: string;
      mediaInfo: any;
      imageUrl: string;
      playerState: string;
      savedPlayerState: any;
      controller: RemotePlayerController | null;
    }

    /**
     * RemotePlayerController - Controls RemotePlayer and handles events
     * https://developers.google.com/cast/docs/reference/web_sender/cast.framework.RemotePlayerController
     */
    class RemotePlayerController {
      constructor(player: RemotePlayer);
      addEventListener(type: string, handler: (event?: RemotePlayerChangedEvent) => void): void;
      removeEventListener(type: string, handler: (event?: RemotePlayerChangedEvent) => void): void;
      playOrPause(): void;
      stop(): void;
      seek(): void;
      muteOrUnmute(): void;
      setVolumeLevel(): void;
      getSeekPosition(currentTime: number, duration: number): number;
      getSeekTime(position: number, duration: number): number;
    }
  }

  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: typeof cast;
    chrome?: {
      cast?: typeof chrome.cast;
    };
  }

  const cast: {
    framework: typeof cast.framework;
  };

  const chrome: {
    cast: typeof chrome.cast;
  };
}

export {};
