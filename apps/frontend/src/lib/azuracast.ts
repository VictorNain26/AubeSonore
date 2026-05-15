import { useEffect, useRef, useState, useCallback } from 'react';
import { safeParse } from 'valibot';
import { STATIC_NOWPLAYING_URL, SSE_URL, STATION_SHORTCODE } from '../utils/config';
import type { NowPlaying } from '@aubesonore/shared-types/azuracast';
import { NowPlayingSchema } from './validators/azuracast';

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

// Module-level guard so we only log the static-endpoint absence once per session
// (React StrictMode double-mount + HMR would otherwise spam the console in dev).
let staticEndpointLogged = false;

export function useNowPlaying() {
  const [data, setData] = useState<NowPlaying | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

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

    eventSource.onmessage = (event: MessageEvent<string>) => {
      if (event.data === '' || event.data === '{}') return;

      let message: SSEMessage;
      try {
        message = JSON.parse(event.data) as SSEMessage;
      } catch (err) {
        console.warn('[SSE] Unexpected non-JSON message:', event.data, err);
        return;
      }

      const candidate =
        message.connect?.subs?.[`station:${STATION_SHORTCODE}`]?.publications?.[0]?.data?.np ??
        message.pub?.data?.np;
      if (!candidate) return;

      const parsed = safeParse(NowPlayingSchema, candidate);
      if (!parsed.success) {
        console.error('[SSE] Invalid NowPlaying shape:', parsed.issues);
        return;
      }
      setData(parsed.output as NowPlaying);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Connexion perdue');
      // Detach handlers before close to prevent re-fire creating a parallel reconnect.
      eventSource.onerror = null;
      eventSource.onmessage = null;
      eventSource.onopen = null;
      eventSource.close();
      reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), 3000);
    };
  }, []);

  // Keep connectRef in sync with the current connect function
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(STATIC_NOWPLAYING_URL);
        if (res.status === 404 || !res.ok) {
          if (!staticEndpointLogged) {
            console.info('[AzuraCast] Static endpoint not available, relying on SSE only');
            staticEndpointLogged = true;
          }
          return;
        }
        const json = (await res.json()) as unknown;
        const parsed = safeParse(NowPlayingSchema, json);
        if (!parsed.success) {
          console.error('[AzuraCast] Invalid static payload:', parsed.issues);
          return;
        }
        if (!cancelled) setData(parsed.output as NowPlaying);
      } catch (err) {
        if (!staticEndpointLogged) {
          console.info(
            '[AzuraCast] Static endpoint unreachable (CORS or network), relying on SSE only:',
            err
          );
          staticEndpointLogged = true;
        }
      }
    })();
    return () => {
      cancelled = true;
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
