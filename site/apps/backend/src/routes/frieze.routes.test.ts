import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

import * as realSchema from '../db/schema';
import { __resetRateLimits } from '../lib/rateLimit';

// The SQL itself is tested in musilogy against Postgres; here the database is
// a double that answers by the musilogy function a query calls, read from the
// SQL drizzle actually builds.
const dialect = new PgDialect();
type Call = { sql: string; params: unknown[] };
let calls: Call[] = [];
let answers: Record<string, Array<Record<string, unknown>>> = {};
let pageRows: Array<{ id: string; slug: string; mbid: string | null }> = [];

function answer(query: SQL) {
  const built = dialect.sqlToQuery(query);
  calls.push({ sql: built.sql, params: built.params });
  const fn = /musilogy\.(\w+)\(/.exec(built.sql)?.[1] ?? '';
  // A list whose asked page lies past its end: that page is empty, the first
  // page (offset 0) carries the total.
  const pastEnd = answers[`${fn}_past_end`];
  if (pastEnd) {
    const offset = fn === 'frieze_window' ? built.params[4] : built.params[2];
    return Promise.resolve({ rows: offset === 0 ? pastEnd : [] });
  }
  return Promise.resolve({ rows: answers[fn] ?? [] });
}

void mock.module('../db/index', () => ({
  schema: realSchema,
  db: {
    execute: answer,
    select: () => ({ from: () => ({ where: () => Promise.resolve(pageRows) }) }),
  },
}));

const { friezeRoutes } = await import('./frieze.routes');
const { friezeOverviewCache } = await import('../services/friezeService');

const GENRE = '0e3fc579-2d24-4f20-9dae-736e1ec78798';
const BOWIE = '5441c29d-3602-4898-b1a1-b77fa23b8e50';
const IGGY = '1a9e1a3b-5b1a-4a5e-8f6e-1c2b3d4e5f60';

const get = (path: string) => friezeRoutes.handle(new Request(`http://localhost${path}`));

function lifeline(mbid: string, listen: string | null, total = '2') {
  return {
    mbid,
    name: mbid === BOWIE ? 'David Bowie' : 'Iggy Pop',
    disambiguation: null,
    type: 'Person',
    y0: 1962,
    y_end: 2016,
    y_end_source: 'declared',
    ended: true,
    y_presence_end: 2016,
    listen_count: listen,
    total,
  };
}

beforeEach(() => {
  __resetRateLimits();
  friezeOverviewCache.dispose();
  calls = [];
  answers = {};
  pageRows = [];
});

describe('GET /api/frieze/overview', () => {
  it('sends the density as columns indexing the genre list', async () => {
    answers.frieze_genres = [
      { genre_mbid: 'g-jazz', name: 'jazz', n_artists: '120' },
      { genre_mbid: 'g-rock', name: 'rock', n_artists: '9000' },
    ];
    answers.frieze_density = [
      { genre_mbid: 'g-rock', year: 1970, present: '512' },
      { genre_mbid: 'g-jazz', year: 1959, present: '40' },
    ];

    const res = await get('/api/frieze/overview');

    expect(await res.json()).toEqual({
      genres: [
        { mbid: 'g-jazz', name: 'jazz', artists: 120 },
        { mbid: 'g-rock', name: 'rock', artists: 9000 },
      ],
      density: { genre: [1, 0], year: [1970, 1959], present: [512, 40] },
    });
  });
});

describe('GET /api/frieze/window', () => {
  it('refuses what is not a MusicBrainz genre id, a reversed period or a page too large', async () => {
    for (const query of [
      `genre=rock&from=1970&to=1980`,
      `genre=${GENRE}&from=1990&to=1980`,
      `genre=${GENRE}&from=1970&to=1980&limit=501`,
      `genre=${GENRE}&from=1970`,
    ]) {
      expect((await get(`/api/frieze/window?${query}`)).status).toBe(400);
    }
    expect(calls).toEqual([]);
  });

  it('links each artist the antenna played to its page, and keeps an unknown count null', async () => {
    answers.frieze_window = [lifeline(BOWIE, '9000000'), lifeline(IGGY, null)];
    pageRows = [{ id: 'page-bowie', slug: 'david-bowie', mbid: BOWIE }];

    const body = (await (
      await get(`/api/frieze/window?genre=${GENRE}&from=1970&to=1980`)
    ).json()) as {
      total: number;
      artists: Array<{ mbid: string; played: unknown; listenCount: number | null }>;
    };

    expect(body.total).toBe(2);
    expect(body.artists.map((a) => [a.mbid, a.played, a.listenCount])).toEqual([
      [BOWIE, { id: 'page-bowie', slug: 'david-bowie' }, 9000000],
      [IGGY, null, null],
    ]);
  });

  it('still says how many there are when a page is asked past the end', async () => {
    answers.frieze_window_past_end = [lifeline(BOWIE, '9000000', '42')];

    const body = (await (
      await get(`/api/frieze/window?genre=${GENRE}&from=1970&to=1980&offset=500`)
    ).json()) as { total: number; artists: unknown[] };

    expect(body).toEqual({ total: 42, artists: [] });
  });
});

describe('GET /api/frieze/artist/:mbid', () => {
  const card = {
    mbid: BOWIE,
    name: 'David Bowie',
    disambiguation: null,
    type: 'Person',
    country: 'GB',
    begin_area: 'Brixton',
    y_birth: 1947,
    y0: 1962,
    y0_source: 'first_album',
    y_end: 2016,
    y_end_source: 'declared',
    ended: true,
    genres: [{ mbid: 'g-rock', name: 'rock', votes: 30 }],
    genre_source: 'declared',
    listen_count: '9000000',
    user_count: '800000',
  };

  it('asks musilogy for the lowercase MBID it compares byte for byte', async () => {
    answers.artist_card = [card];

    await get(`/api/frieze/artist/${BOWIE.toUpperCase()}`);

    expect(calls.find((c) => c.sql.includes('artist_card'))?.params).toEqual([BOWIE]);
  });

  it('answers 400 for a malformed MBID and 404 for one musilogy does not know', async () => {
    expect((await get('/api/frieze/artist/bowie')).status).toBe(400);
    expect((await get(`/api/frieze/artist/${BOWIE}`)).status).toBe(404);
  });

  it('marks every artist of the panel the antenna played', async () => {
    answers.artist_card = [card];
    answers.artist_lineage = [
      {
        side: 'descendant',
        other_mbid: IGGY,
        other_name: 'Iggy Pop',
        other_disambiguation: null,
        other_y0: 1967,
        other_y_end: null,
        source: 'mb_tribute',
      },
    ];
    pageRows = [
      { id: 'page-bowie', slug: 'david-bowie', mbid: BOWIE },
      { id: 'page-iggy', slug: 'iggy-pop', mbid: IGGY },
    ];

    const body = (await (await get(`/api/frieze/artist/${BOWIE}`)).json()) as {
      card: { played: unknown; listenCount: number };
      lineage: Array<{ artist: { played: unknown } }>;
    };

    expect(body.card.played).toEqual({ id: 'page-bowie', slug: 'david-bowie' });
    expect(body.card.listenCount).toBe(9000000);
    expect(body.lineage[0]?.artist.played).toEqual({ id: 'page-iggy', slug: 'iggy-pop' });
  });

  it('counts the contemporaries even on a page past their end', async () => {
    answers.artist_card = [card];
    answers.contemporaries_past_end = [
      {
        mbid: IGGY,
        name: 'Iggy Pop',
        disambiguation: null,
        y0: 1967,
        y_presence_end: 2026,
        scene: 'country',
        shared_genres: ['rock'],
        jaccard: 0.5,
        total: '7',
      },
    ];

    const body = (await (await get(`/api/frieze/artist/${BOWIE}?contemporaries=40`)).json()) as {
      contemporaries: { total: number; offset: number; items: unknown[] };
    };

    expect(body.contemporaries).toEqual({ total: 7, offset: 40, items: [] });
  });

  it('answers 429 once a listener exceeds the budget', async () => {
    let last = 0;
    for (let i = 0; i < 61; i++) last = (await get('/api/frieze/artist/bowie')).status;
    expect(last).toBe(429);
  });
});
