import { ENV, NOW_PLAYING_API_URL } from '../config/env';
import type { NowPlaying, WSMessage } from '../types';

// ─────────────────────────────────────────────
// WebSocket Manager for AzuraCast
// React Native ne supporte pas SSE, on utilise WebSocket
// ─────────────────────────────────────────────

type NowPlayingCallback = (data: NowPlaying) => void;
type ConnectionCallback = (connected: boolean) => void;
type ErrorCallback = (error: string) => void;

// Reconnection configuration
const RECONNECT_CONFIG = {
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds max
  multiplier: 2, // Double delay each attempt
} as const;

class AzuraCastWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private onNowPlayingCallbacks: Set<NowPlayingCallback> = new Set();
  private onConnectionCallbacks: Set<ConnectionCallback> = new Set();
  private onErrorCallbacks: Set<ErrorCallback> = new Set();
  private isConnecting = false;
  private reconnectAttempts = 0;

  connect() {
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;

    const wsUrl = `wss://${ENV.AZURACAST_URL.replace(/^https?:\/\//, '')}/api/live/nowplaying/websocket`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0; // Reset on successful connection
        this.notifyConnection(true);

        // Subscribe to station updates
        this.ws?.send(
          JSON.stringify({
            subs: {
              [`station:${ENV.STATION_SHORTCODE}`]: { recover: true },
            },
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          // Initial connect message with data
          const connectData = message.connect?.subs?.[`station:${ENV.STATION_SHORTCODE}`];
          if (connectData?.publications?.[0]?.data?.np) {
            this.notifyNowPlaying(connectData.publications[0].data.np);
            return;
          }

          // Update messages
          if (message.pub?.data?.np) {
            this.notifyNowPlaying(message.pub.data.np);
          }
        } catch {
          // Ignore empty pings {}
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.notifyError('Erreur de connexion WebSocket');
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        this.notifyConnection(false);

        // Auto-reconnect with exponential backoff
        this.scheduleReconnect();
      };
    } catch {
      this.isConnecting = false;
      this.notifyError('Impossible de se connecter');
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      RECONNECT_CONFIG.baseDelay * Math.pow(RECONNECT_CONFIG.multiplier, this.reconnectAttempts),
      RECONNECT_CONFIG.maxDelay
    );

    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private notifyNowPlaying(data: NowPlaying) {
    this.onNowPlayingCallbacks.forEach((cb) => cb(data));
  }

  private notifyConnection(connected: boolean) {
    this.onConnectionCallbacks.forEach((cb) => cb(connected));
  }

  private notifyError(error: string) {
    this.onErrorCallbacks.forEach((cb) => cb(error));
  }

  subscribe(
    onNowPlaying: NowPlayingCallback,
    onConnection?: ConnectionCallback,
    onError?: ErrorCallback
  ) {
    this.onNowPlayingCallbacks.add(onNowPlaying);
    if (onConnection) this.onConnectionCallbacks.add(onConnection);
    if (onError) this.onErrorCallbacks.add(onError);

    // Connect if not already connected
    if (!this.ws && !this.isConnecting) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.onNowPlayingCallbacks.delete(onNowPlaying);
      if (onConnection) this.onConnectionCallbacks.delete(onConnection);
      if (onError) this.onErrorCallbacks.delete(onError);

      // Disconnect if no more subscribers
      if (this.onNowPlayingCallbacks.size === 0) {
        this.disconnect();
      }
    };
  }
}

// Singleton instance
export const azuraCastWS = new AzuraCastWebSocket();

// ─────────────────────────────────────────────
// Fallback: Polling API for initial data
// ─────────────────────────────────────────────

export async function fetchNowPlaying(): Promise<NowPlaying | null> {
  try {
    const response = await fetch(NOW_PLAYING_API_URL);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
