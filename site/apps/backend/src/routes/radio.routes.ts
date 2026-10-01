import { Elysia } from 'elysia';
import { getStationHistory } from '../services/radioService';
import { logger } from '../lib/logger';

const DEFAULT_ROWS = 120;
const MIN_ROWS = 1;
const MAX_ROWS = 200;

function clampRows(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_ROWS;
  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.trunc(parsed)));
}

export const radioRoutes = new Elysia({ prefix: '/api/radio' }).get(
  '/history',
  async ({ query, set }) => {
    const rows = query?.rows !== undefined ? clampRows(query.rows) : DEFAULT_ROWS;

    try {
      return await getStationHistory(rows);
    } catch (error) {
      logger.warn('radio.history.upstream_error', {
        message: error instanceof Error ? error.message : String(error),
      });
      set.status = 502;
      return { error: 'Radio indisponible' };
    }
  }
);
