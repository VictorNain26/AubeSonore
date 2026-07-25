import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { __resetRateLimits } from '../lib/rateLimit';
import type { TrendsResult } from '../services/trendsService';

const payload: TrendsResult = {
  week: [{ title: 'Week Hit', artist: 'Artist A', artworkUrl: null, likes: 3 }],
  allTime: [{ title: 'All-Time Hit', artist: 'Artist B', artworkUrl: null, likes: 42 }],
};

const getTrendsMock = mock((): Promise<TrendsResult> => Promise.resolve(payload));
void mock.module('../services/trendsService', () => ({ getTrends: getTrendsMock }));

const { trendsRoutes } = await import('./trends.routes');

beforeEach(() => {
  __resetRateLimits();
  getTrendsMock.mockClear();
});

describe('GET /api/trends', () => {
  it('returns the community trends payload', async () => {
    const res = await trendsRoutes.handle(new Request('http://localhost/api/trends'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
  });

  it('rejects with 429 once the per-IP limit is exceeded', async () => {
    let res: Response | null = null;
    for (let i = 0; i < 31; i++) {
      res = await trendsRoutes.handle(new Request('http://localhost/api/trends'));
    }

    expect(res?.status).toBe(429);
    expect(res?.headers.get('retry-after')).toBe('60');
  });
});
