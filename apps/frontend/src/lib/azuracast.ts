import { useEffect, useRef, useState, useCallback } from 'react';
import { SSE_URL, STATION_SHORTCODE } from '../utils/config';
import type { NowPlaying } from '@aubesonore/shared-types/azuracast';

// Re-export shared types for consumers
export type {
  Song,
  SongEntry,
  Mount,
  Station,
  Listeners,
  LiveStatus,
  NowPlaying,
} from '@aubesonore/shared-types/azuracast';

// SSE-specific message types (frontend-only transport)
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
      // Detach handlers before close to prevent re-fire creating a parallel reconnect.
      eventSource.onerror = null;
      eventSource.onmessage = null;
      eventSource.onopen = null;
      eventSource.close();
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.onerror = null;
        eventSourceRef.current.onmessage = null;
        eventSourceRef.current.onopen = null;
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return { data, isConnected, error };
}
