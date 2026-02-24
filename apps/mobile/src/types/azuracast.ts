// Re-export shared AzuraCast types
export type {
  Song,
  SongEntry,
  Mount,
  Station,
  Listeners,
  LiveStatus,
  NowPlaying,
} from '@aubesonore/shared-types/azuracast';

// WebSocket message types — mobile-specific transport
import type { NowPlaying } from '@aubesonore/shared-types/azuracast';

export interface WSConnectMessage {
  connect?: {
    subs?: {
      [key: string]: {
        publications?: Array<{
          data: { np: NowPlaying };
        }>;
      };
    };
  };
}

export interface WSPubMessage {
  pub?: {
    data: { np: NowPlaying };
  };
}

export type WSMessage = WSConnectMessage & WSPubMessage;
