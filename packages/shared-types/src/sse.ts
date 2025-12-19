/**
 * SSE event sent from server
 */
export interface SSEEvent {
  message?: string;
  error?: string;
  data?: unknown;
}

/**
 * SSE message received on client
 */
export interface SSEMessage {
  event: string;
  data: string;
  id?: string;
}

/**
 * Azuracast SSE event data
 */
export interface AzuracastNowPlaying {
  station: {
    id: number;
    name: string;
    listen_url?: string;
  };
  now_playing: {
    elapsed: number;
    duration: number;
    song: {
      id: string;
      text: string;
      artist: string;
      title: string;
      album: string;
      art: string;
    };
  };
  listeners: {
    total: number;
    unique: number;
  };
}
