import { useRef, useState, useEffect } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { toast } from 'react-hot-toast';

const DEFAULT_MESSAGES = [
  'Début de la synchronisation',
  'Synchronisation réussie',
  'Toutes les playlists ont été synchronisées',
  'Début du scrap',
  'Scrap terminé',
  'Traitement de la playlist',
  'Playlist créée',
  'Playlist existante',
  'Morceaux ajoutés',
];

const defaultFilter = (msg = ''): boolean =>
  DEFAULT_MESSAGES.some((phrase) => msg.includes(phrase));

export interface SSEStatus {
  sync: boolean;
  scrape: boolean;
  single: boolean;
}

export interface SSEOptions {
  isScraping?: boolean;
  isSingle?: boolean;
  filter?: (_msg: string) => boolean;
}

export interface SSEMessage {
  pub?: {
    message?: string;
    error?: string;
  };
  message?: string;
  error?: string;
}

export interface UseSSEReturn {
  messages: string[];
  status: SSEStatus;
  isBusy: boolean;
  startSSE: (_url: string, _options?: SSEOptions) => void;
  stopSSE: () => void;
}

export const useSSE = (): UseSSEReturn => {
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState<SSEStatus>({ sync: false, scrape: false, single: false });
  const controllerRef = useRef<AbortController | null>(null);
  const isRunning = useRef<boolean>(false);
  const messagesRef = useRef<string[]>([]); // ✅ pour accès stable à la fin

  const stopSSE = (): void => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    isRunning.current = false;
    setStatus({ sync: false, scrape: false, single: false });
    messagesRef.current = [];
  };

  useEffect(() => stopSSE, []);

  const startSSE = (
    url: string,
    { isScraping = false, isSingle = false, filter = defaultFilter }: SSEOptions = {},
  ): void => {
    stopSSE(); // 🛑 Nettoyage à froid

    isRunning.current = true;
    setMessages([]);
    messagesRef.current = [];
    setStatus({
      sync: !isScraping && !isSingle,
      scrape: isScraping,
      single: isSingle,
    });

    const controller = new AbortController();
    controllerRef.current = controller;

    fetchEventSource(url, {
      signal: controller.signal,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },

      async onopen(res: Response): Promise<void> {
        if (!res.ok) {
          stopSSE();
          throw new Error(`Erreur ouverture SSE : ${res.status}`);
        }
      },

      onmessage(event): void {
        if (!event.data || event.data.trim() === '.') {
          return;
        }

        try {
          const json: SSEMessage = JSON.parse(event.data);
          const msg = json?.pub?.message ?? json?.message ?? '';
          const err = json?.pub?.error ?? json?.error;

          if (err) {
            // eslint-disable-next-line no-console
            console.error('[SSE Error]', err);
            toast.error(`❌ ${err}`);
            stopSSE();
            return;
          }

          if (msg && filter(msg)) {
            messagesRef.current.push(msg);
            setMessages((prev) => [...prev, msg]);
          }
        } catch (err: unknown) {
          // eslint-disable-next-line no-console
          console.error('[SSE Parsing Error]', event.data, err);
          setMessages((prev) => [...prev, `⚠️ Erreur parsing : ${event.data}`]);
          stopSSE();
        }
      },

      onerror(err: unknown): void {
        // eslint-disable-next-line no-console
        console.error('[SSE onerror]', err);
        toast.error('⚠️ Erreur réseau ou serveur SSE');
        stopSSE();
      },

      onclose(): void {
        if (messagesRef.current.length > 0) {
          toast.success('✅ Synchronisation terminée');
        } else {
          toast.error('❌ Synchronisation interrompue ou échouée');
        }
        stopSSE();
      },
    });
  };

  return {
    messages,
    status,
    isBusy: status.sync || status.scrape || status.single,
    startSSE,
    stopSSE,
  };
};
