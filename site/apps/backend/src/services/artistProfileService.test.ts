import { describe, it, expect, mock, spyOn, afterAll, beforeEach } from 'bun:test';

interface ArtistRow {
  id: string;
  displayName: string;
  normalizedName: string;
  slug: string;
  deezerId: string | null;
  mbid: string | null;
}

const baseRow: ArtistRow = {
  id: 'artist-1',
  displayName: 'Daft Punk',
  normalizedName: 'daft punk',
  slug: 'daft-punk',
  deezerId: '27',
  mbid: 'mb-1',
};

let rows: ArtistRow[] = [baseRow];
// Site pages of the similar artists, looked up by Deezer id.
let pageRows: Array<{ id: string; slug: string; deezerId: string }> = [];

const realSchema = await import('../db/schema');

void mock.module('../db', () => ({
  schema: realSchema,
  db: {
    select: () => ({
      from: () => ({
        where: () =>
          Object.assign(Promise.resolve(pageRows), { limit: () => Promise.resolve(rows) }),
      }),
    }),
  },
}));

// spyOn on the real exports, restored after this file: mock.module would
// replace these modules for every other test file of the run (Bun 1.3).
const deezer = await import('./deezerService');
const lastfm = await import('./lastfmService');
const musicbrainz = await import('./musicbrainzService');
const radioPlays = await import('./radioPlayService');

const spies = [
  spyOn(deezer, 'getArtist').mockResolvedValue({
    id: '27',
    name: 'Daft Punk',
    picture: 'https://cdn.deezer.com/dp.jpg',
  }),
  spyOn(deezer, 'getRelatedArtists').mockResolvedValue([
    { id: '1', name: 'Justice', picture: 'https://cdn.deezer.com/j.jpg' },
  ]),
  spyOn(deezer, 'getTopTracks').mockResolvedValue([
    { title: 'Around the World', link: 'https://deezer.com/track/1' },
  ]),
  spyOn(lastfm, 'getArtistInfo').mockResolvedValue({
    bio: 'Un duo français.',
    tags: ['french house'],
    similarArtists: [],
    listeners: 4200,
  }),
  spyOn(musicbrainz, 'getArtistLinks').mockResolvedValue([
    { platform: 'official', url: 'https://daftpunk.com' },
  ]),
  spyOn(radioPlays, 'getPlaysByArtist').mockResolvedValue([
    { title: 'Around the World', artist: 'Daft Punk', playedAt: '2026-07-27T10:00:00.000Z' },
  ]),
];

afterAll(() => {
  for (const spy of spies) spy.mockRestore();
});

const { getArtistProfile } = await import('./artistProfileService');

beforeEach(() => {
  rows = [baseRow];
  pageRows = [];
});

describe('getArtistProfile', () => {
  it('composes every source into one profile', async () => {
    const profile = await getArtistProfile('artist-1');

    expect(profile).not.toBeNull();
    expect(profile?.name).toBe('Daft Punk');
    expect(profile?.slug).toBe('daft-punk');
    expect(profile?.image).toBe('https://cdn.deezer.com/dp.jpg');
    expect(profile?.bio).toBe('Un duo français.');
    expect(profile?.tags).toEqual(['french house']);
    expect(profile?.listeners).toBe(4200);
    expect(profile?.similar).toEqual([
      { name: 'Justice', image: 'https://cdn.deezer.com/j.jpg', page: null },
    ]);
    expect(profile?.topTracks).toEqual([
      { title: 'Around the World', url: 'https://deezer.com/track/1' },
    ]);
    expect(profile?.links).toEqual([{ platform: 'official', url: 'https://daftpunk.com' }]);
    expect(profile?.playedOnRadio).toEqual([
      { title: 'Around the World', artist: 'Daft Punk', playedAt: '2026-07-27T10:00:00.000Z' },
    ]);
    expect(profile?.resolved).toBe(true);
  });

  it('links a similar artist to its page on the site when the antenna played them', async () => {
    pageRows = [{ id: 'artist-2', slug: 'justice', deezerId: '1' }];

    const profile = await getArtistProfile('artist-1');

    expect(profile?.similar).toEqual([
      {
        name: 'Justice',
        image: 'https://cdn.deezer.com/j.jpg',
        page: { id: 'artist-2', slug: 'justice' },
      },
    ]);
  });

  it('keeps the radio floor when the artist matched no upstream', async () => {
    rows = [{ ...baseRow, deezerId: null, mbid: null }];

    const profile = await getArtistProfile('artist-1');

    expect(profile?.resolved).toBe(false);
    expect(profile?.image).toBeNull();
    expect(profile?.similar).toEqual([]);
    expect(profile?.topTracks).toEqual([]);
    expect(profile?.links).toEqual([]);
    expect(profile?.playedOnRadio).toHaveLength(1);
  });

  it('returns null for an unknown id', async () => {
    rows = [];

    expect(await getArtistProfile('nope')).toBeNull();
  });
});
