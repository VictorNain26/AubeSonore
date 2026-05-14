import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { sseHandlers } from './sse-handlers';

export const server = setupServer(...handlers, ...sseHandlers);
