interface SSEData {
  connect?: { time: number };
  heartbeat?: number;
  error?: string;
  [key: string]: unknown;
}

type SSEHandler = (send: (data: SSEData) => void) => Promise<void>;

export function createSSEStream(handler: SSEHandler): ReadableStream<string> {
  let controllerRef: ReadableStreamDefaultController<string> | undefined;
  let isClosed = false;

  return new ReadableStream({
    start(controller) {
      controllerRef = controller;

      const sendEvent = (data: SSEData): void => {
        if (isClosed) {
          return;
        }

        try {
          const json = JSON.stringify({ pub: data });
          controller.enqueue(`data: ${json}\n\n`);
          console.log('[SSE]', json);
        } catch (err: unknown) {
          console.error('[SSE enqueue error]', err);
          try {
            controller.error(err);
          } catch (e) {
            console.warn('[SSE] Impossible d’envoyer l’erreur, flux déjà fermé.');
          }
          isClosed = true;
        }
      };

      // 🟢 Connexion initiale
      sendEvent({ connect: { time: Date.now() } });

      // ❤️ Battement de cœur toutes les 25s pour éviter timeouts nginx/proxy
      const heartbeat = setInterval(() => {
        if (!isClosed) {
          sendEvent({ heartbeat: Date.now() });
        }
      }, 25000);

      // ⛓️ Appel de ton handler principal
      handler(sendEvent)
        .catch((err: unknown) => {
          console.error('[SSE handler error]', err);
          sendEvent({ error: (err instanceof Error ? err.message : 'Erreur SSE interne') });
        })
        .finally((): void => {
          if (!isClosed && !controller.desiredSize) {
            controller.close();
            isClosed = true;
          }
          clearInterval(heartbeat);
          console.log('[SSE] Stream terminé proprement');
        });
    },

    cancel(): void {
      console.log('[SSE] Annulé par le client (déconnexion)');
      if (controllerRef && !controllerRef.desiredSize && !isClosed) {
        controllerRef.close();
        isClosed = true;
      }
    },
  });
}
