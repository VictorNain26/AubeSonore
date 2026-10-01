import { describe, it, expect, mock, beforeEach } from 'bun:test';

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

void mock.module('../db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve(rows) }),
      }),
    }),
  },
}));

void mock.module('./deezerService', () => ({
  getArtist: () =>
    Promise.resolve({ id: '27', name: 'Daft Punk', picture: 'https://cdn.deezer.com/dp.jpg' }),
  getRelatedArtists: () =>
    Promise.resolve([{ id: '1', name: 'Justice', picture: 'https://cdn.deezer.com/j.jpg' }]),
  getTopTracks: () =>
    Promise.resolve([{ title: 'Around the World', link: 'https://deezer.com/track/1' }]),
}));

void mock.module('./lastfmService', () => ({
  getArtistInfo: () =>
    Promise.resolve({
      bio: 'Un duo français.',
      tags: ['french house'],
      similarArtists: [],
      listeners: 4200,
    }),
}));

void mock.module('./musicbrainzService', () => ({
  getArtistLinks: () => Promise.resolve([{ platform: 'official', url: 'https://daftpunk.com' }]),
}));

void mock.module('./radioPlayService', () => ({
  getPlaysByArtist: () =>
    Promise.resolve([
      { title: 'Around the World', artist: 'Daft Punk', playedAt: '2026-07-27T10:00:00.000Z' },
    ]),
}));

const { getArtistProfile } = await import('./artistProfileService');

beforeEach(() => {
  rows = [baseRow];
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
      { id: '1', name: 'Justice', image: 'https://cdn.deezer.com/j.jpg' },
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
