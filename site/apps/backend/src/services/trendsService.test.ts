import { beforeEach, describe, expect, it, mock } from 'bun:test';

import * as realSchema from '../db/schema';
import type { TrendEntry } from './trendsService';

const weekRows: TrendEntry[] = [
  { title: 'Week Hit', artist: 'Artist A', artworkUrl: 'https://cdn.example.com/a.jpg', likes: 4 },
];
const allTimeRows: TrendEntry[] = [
  { title: 'All-Time Hit', artist: 'Artist B', artworkUrl: null, likes: 42 },
];

let selectCalls = 0;
let whereCalls = 0;

// Chainable fake matching the exact query shape trendsService builds:
// select().from().$dynamic()[.where()].groupBy().orderBy().limit().
// Rows with a `where` clause stand in for the week query, rows without for all-time.
const fakeDb = {
  select: () => {
    selectCalls++;
    let filtered = false;
    const builder = {
      from: () => builder,
      $dynamic: () => builder,
      where: () => {
        whereCalls++;
        filtered = true;
        return builder;
      },
      groupBy: () => builder,
      orderBy: () => builder,
      limit: (): Promise<TrendEntry[]> => Promise.resolve(filtered ? weekRows : allTimeRows),
    };
    return builder;
  },
};

void mock.module('../db/index', () => ({ db: fakeDb, schema: realSchema }));

const { getTrends, trendsCache } = await import('./trendsService');

beforeEach(() => {
  selectCalls = 0;
  whereCalls = 0;
  trendsCache.dispose();
});

describe('getTrends', () => {
  it('returns week and all-time rankings from two aggregate queries', async () => {
    const result = await getTrends();

    expect(result.week).toEqual(weekRows);
    expect(result.allTime).toEqual(allTimeRows);
    expect(selectCalls).toBe(2);
    expect(whereCalls).toBe(1);
  });

  it('serves the cached result on subsequent calls', async () => {
    await getTrends();
    const second = await getTrends();

    expect(selectCalls).toBe(2);
    expect(second.week).toEqual(weekRows);
  });

  it('re-queries after the cache entry is evicted', async () => {
    await getTrends();
    trendsCache.dispose();

    await getTrends();

    expect(selectCalls).toBe(4);
  });
});
