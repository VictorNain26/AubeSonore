import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { ArtistSearch } from './deezerService';
import type { NowPlayingTrack } from './nowPlaying';

let artistRows: Array<{ id: string; slug: string }> = [];
let playRows: Array<{ id: string }> = [];
let inserted: Array<Record<string, unknown>> = [];
let search: ArtistSearch = { status: 'none' };
let nowPlaying: NowPlayingTrack | null = null;
let searches = 0;

const schema = await import('../db/schema');

void mock.module('../db', () => ({
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

void mock.module('./deezerService', () => ({
  searchArtist: () => {
    searches += 1;
    return Promise.resolve(search);
  },
}));

void mock.module('./nowPlaying', () => ({
  fetchNowPlaying: () => Promise.resolve(nowPlaying),
}));

const { normalizeArtistName, primaryArtistName, resolveArtist, slugify } =
  await import('./artistResolver');

beforeEach(() => {
  artistRows = [];
  playRows = [];
  inserted = [];
  search = { status: 'none' };
  nowPlaying = null;
  searches = 0;
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
  });

  it('persists nothing while Deezer is failing, so the next call retries', async () => {
    playRows = [{ id: 'p-1' }];
    search = { status: 'failed' };

    expect(await resolveArtist('Air')).toBeNull();
    expect(inserted).toEqual([]);
  });

  it('gives an artist Deezer does not know a page of its own', async () => {
    playRows = [{ id: 'p-1' }];

    const resolved = await resolveArtist('Unsigned Band feat. Friend');

    expect(resolved?.slug).toBe('unsigned-band');
    expect(inserted[0]).toMatchObject({
      normalizedName: 'unsigned band',
      displayName: 'Unsigned Band',
      deezerId: null,
    });
  });

  it('binds a Deezer match and takes its spelling', async () => {
    playRows = [{ id: 'p-1' }];
    search = { status: 'match', artist: { id: '27', name: 'Daft Punk', picture: null } };

    await resolveArtist('daft punk');

    expect(inserted[0]).toMatchObject({
      displayName: 'Daft Punk',
      deezerId: '27',
      slug: 'daft-punk',
    });
  });

  it('resolves a name written without Latin letters', async () => {
    playRows = [{ id: 'p-1' }];

    expect(await resolveArtist('Кино')).toMatchObject({ slug: 'кино' });
  });
});
