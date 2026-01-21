import { useEffect, useRef, useState, useCallback } from 'react';
import { SSE_URL, STATION_SHORTCODE } from '../utils/config';

// Types basés sur l'API AzuraCast
export interface Song {
  id: string;
  art: string;
  text: string;
  artist: string;
  title: string;
  album: string;
  genre: string;
  isrc: string;
  lyrics: string;
}

export interface SongEntry {
  sh_id: number;
  played_at: number;
  duration: number;
  playlist: string;
  streamer: string;
  is_request: boolean;
  song: Song;
  elapsed?: number;
  remaining?: number;
}

export interface Mount {
  id: number;
  name: string;
  url: string;
  bitrate: number;
  format: string;
  listeners: {
    total: number;
    unique: number;
    current: number;
  };
  path: string;
  is_default: boolean;
}

export interface Station {
  id: number;
  name: string;
  shortcode: string;
  description: string;
  frontend: string;
  backend: string;
  timezone: string;
  listen_url: string;
  url: string;
  public_player_url: string;
  playlist_pls_url: string;
  playlist_m3u_url: string;
  is_public: boolean;
  requests_enabled: boolean;
  mounts: Mount[];
  remotes: unknown[];
  hls_enabled: boolean;
  hls_url: string | null;
}

export interface Listeners {
  total: number;
  unique: number;
  current: number;
}

export interface LiveStatus {
  is_live: boolean;
  streamer_name: string;
  broadcast_start: number | null;
  art: string | null;
}

export interface NowPlaying {
  station: Station;
  listeners: Listeners;
  live: LiveStatus;
  now_playing: SongEntry;
  playing_next: SongEntry | null;
  song_history: SongEntry[];
  is_online: boolean;
}

interface SSEConnectMessage {
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

interface SSEPubMessage {
  pub?: {
    data: { np: NowPlaying };
  };
}

type SSEMessage = SSEConnectMessage & SSEPubMessage;

export function useNowPlaying() {
  const [data, setData] = useState<NowPlaying | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Nettoyage
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Construction de l'URL SSE avec paramètres de souscription
    const subs = {
      [`station:${STATION_SHORTCODE}`]: { recover: true },
    };
    const sseUrl = `${SSE_URL}?cf_connect=${encodeURIComponent(JSON.stringify({ subs }))}`;

    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);

        // Message de connexion initial avec données
        const connectData = message.connect?.subs?.[`station:${STATION_SHORTCODE}`];
        if (connectData?.publications?.[0]?.data?.np) {
          setData(connectData.publications[0].data.np);
          return;
        }

        // Messages de mise à jour
        if (message.pub?.data?.np) {
          setData(message.pub.data.np);
        }
      } catch {
        // Ignorer les pings vides {}
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Connexion perdue');
      eventSource.close();

      // Reconnexion automatique après 3s
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { data, isConnected, error };
}
