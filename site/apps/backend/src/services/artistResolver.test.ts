import { describe, it, expect, mock, spyOn, afterAll, beforeEach } from 'bun:test';
import type { ArtistSearch } from './deezerService';
import type { NowPlayingTrack } from './nowPlaying';

let artistRows: Array<{ id: string; slug: string }> = [];
let playRows: Array<{ title: string }> = [];
let inserted: Array<Record<string, unknown>> = [];
let search: ArtistSearch = { status: 'none' };
let nowPlaying: NowPlayingTrack | null = null;
let searches = 0;
let searchedTitles: string[] = [];

const schema = await import('../db/schema');

void mock.module('../db', () => ({
  schema,
  db: {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: () => Promise.resolve(table === schema.radioPlay ? playRows : artistRows),
        }),
      }),
    }),
    insert: () => ({
      values: (row: Record<string, unknown>) => ({
        onConflictDoNothing: () => ({
          returning: () => {
            inserted.push(row);
            return Promise.resolve([{ id: row.id, slug: row.slug }]);
          },
        }),
      }),
    }),
  },
}));

// spyOn on the real exports, restored after this file: mock.module would
// replace these modules for every other test file of the run (Bun 1.3).
const deezer = await import('./deezerService');
const onAir = await import('./nowPlaying');

const spies = [
  spyOn(deezer, 'searchArtist').mockImplementation((_name: string, title: string) => {
    searches += 1;
    searchedTitles.push(title);
    return Promise.resolve(search);
  }),
  spyOn(onAir, 'fetchNowPlaying').mockImplementation(() => Promise.resolve(nowPlaying)),
];

afterAll(() => {
  for (const spy of spies) spy.mockRestore();
});

const { normalizeArtistName, primaryArtistName, resolveArtist, slugify } =
  await import('./artistResolver');

beforeEach(() => {
  artistRows = [];
  playRows = [];
  inserted = [];
  search = { status: 'none' };
  nowPlaying = null;
  searches = 0;
  searchedTitles = [];
});

describe('primaryArtistName', () => {
  it('strips explicit featuring markers', () => {
    expect(primaryArtistName('Justice feat. Uffie')).toBe('Justice');
    expect(primaryArtistName('Justice ft. Uffie')).toBe('Justice');
    expect(primaryArtistName('Justice featuring Uffie')).toBe('Justice');
    expect(primaryArtistName('Justice FEAT Uffie')).toBe('Justice');
  });

  it('keeps ampersands, plus signs and commas that belong to the name', () => {
    expect(primaryArtistName('Simon & Garfunkel')).toBe('Simon & Garfunkel');
    expect(primaryArtistName('Florence + The Machine')).toBe('Florence + The Machine');
    expect(primaryArtistName('Earth, Wind & Fire')).toBe('Earth, Wind & Fire');
  });

  it('leaves a name containing "feat" as a substring alone', () => {
    expect(primaryArtistName('Defeated Sanity')).toBe('Defeated Sanity');
  });

  it('trims surrounding whitespace', () => {
    expect(primaryArtistName('  Air  ')).toBe('Air');
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Daft Punk')).toBe('daft-punk');
  });

  it('strips diacritics', () => {
    expect(slugify('Étienne Daho')).toBe('etienne-daho');
  });

  it('collapses punctuation and trims stray hyphens', () => {
    expect(slugify('Simon & Garfunkel!')).toBe('simon-garfunkel');
    expect(slugify('!!!')).toBe('');
  });

  it('keeps letters of every script', () => {
    expect(slugify('Кино')).toBe('кино');
  });
});

describe('normalizeArtistName', () => {
  it('folds case, accents and punctuation', () => {
    expect(normalizeArtistName('Beyoncé')).toBe(normalizeArtistName('BEYONCE'));
    expect(normalizeArtistName('Simon & Garfunkel')).toBe('simon garfunkel');
  });

  it('keys names written without Latin letters', () => {
    expect(normalizeArtistName('坂本龍一')).toBe('坂本龍一');
    expect(normalizeArtistName('Кино')).toBe('кино');
  });
});

describe('resolveArtist', () => {
  it('returns a known artist without asking Deezer', async () => {
    artistRows = [{ id: 'a-1', slug: 'air' }];

    expect(await resolveArtist('Air')).toEqual({ id: 'a-1', slug: 'air' });
    expect(searches).toBe(0);
  });

  it('creates no page for a name the antenna never played', async () => {
    nowPlaying = { sh_id: 1, title: 'X', artist: 'Someone Else' };

    expect(await resolveArtist('Buy Cheap Pills')).toBeNull();
    expect(searches).toBe(0);
    expect(inserted).toEqual([]);
  });

  it('accepts the artist on air before the watcher has recorded it', async () => {
    nowPlaying = { sh_id: 1, title: 'Kelly Watch the Stars', artist: 'Air feat. Someone' };

    expect(await resolveArtist('Air')).not.toBeNull();
    expect(inserted).toHaveLength(1);
    expect(searchedTitles).toEqual(['Kelly Watch the Stars']);
  });

  it('tells homonyms apart by a title the antenna played', async () => {
    playRows = [{ title: 'Cassius 1999' }];

    await resolveArtist('Cassius');

    expect(searchedTitles).toEqual(['Cassius 1999']);
  });

  it('persists nothing while Deezer is failing, so the next call retries', async () => {
    playRows = [{ title: 'Kelly Watch the Stars' }];
    search = { status: 'failed' };

    expect(await resolveArtist('Air')).toBeNull();
    expect(inserted).toEqual([]);
  });

  it('gives an artist Deezer does not know a page of its own', async () => {
    playRows = [{ title: 'Kelly Watch the Stars' }];

    const resolved = await resolveArtist('Unsigned Band feat. Friend');

    expect(resolved?.slug).toBe('unsigned-band');
    expect(inserted[0]).toMatchObject({
      normalizedName: 'unsigned band',
      displayName: 'Unsigned Band',
      deezerId: null,
    });
  });

  it('binds a Deezer match and takes its spelling', async () => {
    playRows = [{ title: 'Kelly Watch the Stars' }];
    search = { status: 'match', artist: { id: '27', name: 'Daft Punk', picture: null } };

    await resolveArtist('daft punk');

    expect(inserted[0]).toMatchObject({
      displayName: 'Daft Punk',
      deezerId: '27',
      slug: 'daft-punk',
    });
  });

  it('resolves a name written without Latin letters', async () => {
    playRows = [{ title: 'Kelly Watch the Stars' }];

    expect(await resolveArtist('Кино')).toMatchObject({ slug: 'кино' });
  });
});
