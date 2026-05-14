import { setupServer } from 'msw/node';
import type { HttpHandler } from 'msw';
import { handlers } from './handlers';

// SSE handlers require EventSource API (only available in jsdom).
// Lazy-load to avoid initialization errors in node environment.
function getHandlers(): HttpHandler[] {
  const allHandlers: HttpHandler[] = [...handlers];

  if (typeof EventSource !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sseModule = require('./sse-handlers') as { sseHandlers: HttpHandler[] };
    allHandlers.push(...sseModule.sseHandlers);
  }

  return allHandlers;
}

export const server = setupServer(...getHandlers());
