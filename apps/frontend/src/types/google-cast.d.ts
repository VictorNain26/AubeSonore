/**
 * Google Cast SDK Type Declarations
 * Minimal types for the Cast Web Sender SDK
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
    const CastState: {
      NO_DEVICES_AVAILABLE: CastState;
      NOT_CONNECTED: CastState;
      CONNECTING: CastState;
      CONNECTED: CastState;
    };

    type CastState = 'NO_DEVICES_AVAILABLE' | 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED';

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

    const CastContextEventType: {
      CAST_STATE_CHANGED: string;
      SESSION_STATE_CHANGED: string;
    };

    interface CastOptions {
      receiverApplicationId: string;
      autoJoinPolicy?: string;
      language?: string;
      resumeSavedSession?: boolean;
    }

    interface CastStateEventData {
      castState: CastState;
    }

    interface SessionStateEventData {
      sessionState: SessionState;
      session?: CastSession;
      errorCode?: string;
    }

    interface CastDevice {
      deviceId: string;
      friendlyName: string;
      capabilities: number;
    }

    class CastSession {
      getCastDevice(): CastDevice | null;
      getSessionState(): SessionState;
      loadMedia(loadRequest: chrome.cast.media.LoadRequest): Promise<void>;
      endSession(stopCasting: boolean): void;
    }

    class CastContext {
      static getInstance(): CastContext;
      setOptions(options: CastOptions): void;
      getCastState(): CastState;
      getCurrentSession(): CastSession | null;
      requestSession(): Promise<void>;
      addEventListener(type: string, handler: (event: any) => void): void;
      removeEventListener(type: string, handler: (event: any) => void): void;
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
