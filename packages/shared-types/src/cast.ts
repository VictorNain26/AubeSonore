// Shared cast types

export type CastConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface CastMediaMetadata {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
}
