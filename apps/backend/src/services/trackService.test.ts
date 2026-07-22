import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

import type { LikedTrack, User } from '../db/schema';
import * as realSchema from '../db/schema';
import type { SonglinkResult } from './songlinkService';

type Row = LikedTrack;

let rows: Row[] = [];

function makeRow(values: Partial<Row>): Row {
  return {
    id: values.id ?? 'track-1',
    title: values.title ?? 'Title',
    artist: values.artist ?? 'Artist',
    album: values.album ?? null,
    artworkUrl: values.artworkUrl ?? null,
    youtubeUrl: values.youtubeUrl ?? 'https://youtube.example.com/watch?v=x',
    isrc: values.isrc ?? null,
    songlinkUrl: values.songlinkUrl ?? null,
    platformLinks: values.platformLinks ?? null,
    createdAt: values.createdAt ?? new Date(),
    userId: values.userId ?? 'user-1',
  };
}

function pick<K extends keyof Row>(row: Row, keys: K[]): Pick<Row, K> {
  const result = {} as Pick<Row, K>;
  for (const key of keys) result[key] = row[key];
  return result;
}

// Minimal fake matching only the query shapes trackService.ts actually uses
// (single row per test — `where` clauses are accepted but not evaluated).
const fakeDb = {
  insert: () => ({
    values: (values: Partial<Row>) => ({
      onConflictDoNothing: () => ({
        returning: (): Promise<Row[]> => {
          const row = makeRow(values);
          rows = [row];
          return Promise.resolve([row]);
        },
      }),
    }),
  }),
  select: (projection?: Partial<Record<keyof Row, unknown>>) => ({
    from: () => ({
      // where() itself resolves the unfiltered/unlimited case (refreshAllLinks
      // awaits it directly), and also exposes .limit() for the call sites that
      // paginate (where clauses are accepted but not evaluated, as above).
      where: () => {
        const project = (slice: Row[]): Array<Partial<Row>> => {
          if (!projection) return slice;
          const keys = Object.keys(projection) as (keyof Row)[];
          return slice.map((row) => pick(row, keys));
        };
        const promise = Promise.resolve(project(rows)) as Promise<Array<Partial<Row>>> & {
          limit: (n: number) => Promise<Array<Partial<Row>>>;
        };
        promise.limit = (n: number) => Promise.resolve(project(rows.slice(0, n)));
        return promise;
      },
    }),
  }),
  update: () => ({
    set: (values: Partial<Row>) => ({
      where: (): Promise<Row[]> & { returning: () => Promise<Row[]> } => {
        rows = rows.map((row) => ({ ...row, ...values }));
        const result = [...rows];
        const promise = Promise.resolve(result) as Promise<Row[]> & {
          returning: () => Promise<Row[]>;
        };
        promise.returning = () => Promise.resolve(result);
        return promise;
      },
    }),
  }),
};

void mock.module('../db/index', () => ({ db: fakeDb, schema: realSchema }));

const searchSonglinkMock = mock((): Promise<SonglinkResult | null> => Promise.resolve(null));
void mock.module('./songlinkService', () => ({ searchSonglink: searchSonglinkMock }));

const { likeTrack, refreshTrackLinks, refreshAllLinks, coverSnapshot } =
  await import('./trackService');

// Spy the internal cover-snapshot seam instead of mock.module('./coverService'):
// a global module mock leaks across bun test files and poisoned coverService.test.ts.
const snapshotCoverMock = spyOn(coverSnapshot, 'run');
snapshotCoverMock.mockResolvedValue(null);

const fakeUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: true,
  image: null,
  role: 'user',
  banned: null,
  banReason: null,
  banExpires: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// enrichTrackInBackground is fire-and-forget from likeTrack; flush the
// macrotask queue so its microtask chain (select → searchSonglink →
// snapshotCover → update) has settled before assertions run.
async function flushBackgroundWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  rows = [];
  searchSonglinkMock.mockClear();
  snapshotCoverMock.mockClear();
});

describe('likeTrack → background enrichment', () => {
  it('snapshots the AzuraCast artwork to R2 when Songlink has no match (emerging artist)', async () => {
    searchSonglinkMock.mockResolvedValueOnce(null);
    snapshotCoverMock.mockResolvedValueOnce('https://covers.example.com/covers/r2.jpg');

    await likeTrack({
      user: fakeUser,
      body: {
        title: 'Unknown Song',
        artist: 'Emerging Artist',
        youtubeUrl: 'https://youtube.example.com/watch?v=abc',
        artworkUrl: 'https://azuracast.example.com/art/abc.jpg',
      },
    });
    await flushBackgroundWork();

    expect(snapshotCoverMock).toHaveBeenCalledWith('https://azuracast.example.com/art/abc.jpg');
    expect(rows[0]?.artworkUrl).toBe('https://covers.example.com/covers/r2.jpg');
    expect(rows[0]?.songlinkUrl).toBeNull();
  });

  it('prefers the Songlink artwork over the AzuraCast one when a match is found', async () => {
    searchSonglinkMock.mockResolvedValueOnce({
      pageUrl: 'https://song.link/abc',
      platformLinks: { spotify: 'https://open.spotify.com/track/abc' },
      artworkUrl: 'https://apple-cdn.example.com/art/hd.jpg',
    });
    snapshotCoverMock.mockResolvedValueOnce('https://covers.example.com/covers/hd.jpg');

    await likeTrack({
      user: fakeUser,
      body: {
        title: 'Known Song',
        artist: 'Known Artist',
        youtubeUrl: 'https://youtube.example.com/watch?v=def',
        artworkUrl: 'https://azuracast.example.com/art/def.jpg',
      },
    });
    await flushBackgroundWork();

    expect(snapshotCoverMock).toHaveBeenCalledWith('https://apple-cdn.example.com/art/hd.jpg');
    expect(rows[0]?.artworkUrl).toBe('https://covers.example.com/covers/hd.jpg');
    expect(rows[0]?.songlinkUrl).toBe('https://song.link/abc');
    expect(rows[0]?.platformLinks).toEqual({ spotify: 'https://open.spotify.com/track/abc' });
  });

  it('leaves artwork_url untouched when both Songlink and the snapshot fail', async () => {
    searchSonglinkMock.mockResolvedValueOnce(null);
    snapshotCoverMock.mockResolvedValueOnce(null);

    await likeTrack({
      user: fakeUser,
      body: {
        title: 'Song',
        artist: 'Artist',
        youtubeUrl: 'https://youtube.example.com/watch?v=ghi',
        artworkUrl: 'https://azuracast.example.com/art/ghi.jpg',
      },
    });
    await flushBackgroundWork();

    expect(rows[0]?.artworkUrl).toBe('https://azuracast.example.com/art/ghi.jpg');
  });
});

describe('refreshTrackLinks', () => {
  it('re-snapshots artwork on refresh — serves as a retry for a failed like-time snapshot', async () => {
    rows = [
      makeRow({
        id: 'track-2',
        title: 'Song',
        artist: 'Artist',
        artworkUrl: 'https://azuracast.example.com/art/stale.jpg',
        userId: fakeUser.id,
      }),
    ];
    searchSonglinkMock.mockResolvedValueOnce({
      pageUrl: 'https://song.link/xyz',
      platformLinks: { spotify: 'https://open.spotify.com/track/xyz' },
      artworkUrl: 'https://apple-cdn.example.com/art/xyz.jpg',
    });
    snapshotCoverMock.mockResolvedValueOnce('https://covers.example.com/covers/xyz.jpg');

    const result = await refreshTrackLinks({ user: fakeUser, id: 'track-2' });

    expect(snapshotCoverMock).toHaveBeenCalledWith('https://apple-cdn.example.com/art/xyz.jpg');
    expect(result.track?.artworkUrl).toBe('https://covers.example.com/covers/xyz.jpg');
    expect(result.track?.songlinkUrl).toBe('https://song.link/xyz');
  });

  it('returns an error and never snapshots when Songlink still has no match', async () => {
    rows = [
      makeRow({
        id: 'track-3',
        userId: fakeUser.id,
        artworkUrl: 'https://azuracast.example.com/art/none.jpg',
      }),
    ];
    searchSonglinkMock.mockResolvedValueOnce(null);

    const result = await refreshTrackLinks({ user: fakeUser, id: 'track-3' });

    expect(result.status).toBe(400);
    expect(snapshotCoverMock).not.toHaveBeenCalled();
    expect(rows[0]?.artworkUrl).toBe('https://azuracast.example.com/art/none.jpg');
  });
});

describe('refreshAllLinks', () => {
  it('snapshots the best cover source to R2 for each track it refreshes', async () => {
    rows = [
      makeRow({
        id: 'track-4',
        title: 'Song',
        artist: 'Artist',
        artworkUrl: 'https://azuracast.example.com/art/batch.jpg',
        userId: fakeUser.id,
      }),
    ];
    searchSonglinkMock.mockResolvedValueOnce({
      pageUrl: 'https://song.link/batch',
      platformLinks: { spotify: 'https://open.spotify.com/track/batch' },
      artworkUrl: 'https://apple-cdn.example.com/art/batch.jpg',
    });
    snapshotCoverMock.mockResolvedValueOnce('https://covers.example.com/covers/batch.jpg');

    const result = await refreshAllLinks({ user: fakeUser });

    expect(snapshotCoverMock).toHaveBeenCalledWith('https://apple-cdn.example.com/art/batch.jpg');
    expect(rows[0]?.artworkUrl).toBe('https://covers.example.com/covers/batch.jpg');
    expect(result.updated).toBe(1);
  });
});
