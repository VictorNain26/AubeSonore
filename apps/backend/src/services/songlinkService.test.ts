import { describe, it, expect, spyOn, afterEach } from 'bun:test';

const { searchSonglink } = await import('./songlinkService');

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore?.();
});

function itunesResponse(
  results: Array<{
    trackViewUrl: string;
    trackName: string;
    artistName: string;
    artworkUrl100?: string;
  }>
): Response {
  return new Response(JSON.stringify({ resultCount: results.length, results }), {
    headers: { 'content-type': 'application/json' },
  });
}

function songlinkResponse(): Response {
  return new Response(
    JSON.stringify({
      entityUniqueId: 'APPLE_MUSIC_SONG::1',
      userCountry: 'FR',
      pageUrl: 'https://song.link/i/1',
      linksByPlatform: {
        spotify: { url: 'https://open.spotify.com/track/1', entityUniqueId: 'SPOTIFY_SONG::1' },
      },
      entitiesByUniqueId: {
        'APPLE_MUSIC_SONG::1': {
          id: '1',
          type: 'song',
          title: 'Sunbeam',
          artistName: 'The Larks',
          thumbnailUrl: 'https://thumb.example.com/sunbeam.jpg',
          apiProvider: 'apple',
          platforms: ['appleMusic'],
        },
      },
    }),
    { headers: { 'content-type': 'application/json' } }
  );
}

describe('searchSonglink', () => {
  it('returns cover + links when the top iTunes candidate is the exact song', async () => {
    spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        itunesResponse([
          {
            trackViewUrl: 'https://music.apple.com/track/sunbeam',
            trackName: 'Sunbeam',
            artistName: 'The Larks',
            artworkUrl100: 'https://cdn.example.com/sunbeam-100x100bb.jpg',
          },
        ])
      )
      .mockResolvedValueOnce(songlinkResponse());

    const result = await searchSonglink('Sunbeam', 'The Larks');

    expect(result).not.toBeNull();
    expect(result?.artworkUrl).toBe('https://thumb.example.com/sunbeam.jpg');
    expect(result?.platformLinks.spotify).toBe('https://open.spotify.com/track/1');
    expect(result?.pageUrl).toBe('https://song.link/i/1');
  });

  it('returns cover only when the top iTunes result is a different song by the right artist', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      itunesResponse([
        {
          trackViewUrl: 'https://music.apple.com/track/house',
          trackName: 'House',
          artistName: 'The Sophs',
          artworkUrl100: 'https://cdn.example.com/house-100x100bb.jpg',
        },
      ])
    );

    const result = await searchSonglink('Goldstar', 'The Sophs');

    expect(result).not.toBeNull();
    expect(result?.artworkUrl).toBe('https://cdn.example.com/house-600x600bb.jpg');
    expect(result?.platformLinks).toEqual({});
    expect(result?.pageUrl).toBeUndefined();
  });

  it('returns null when only wrong-artist candidates are found', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      itunesResponse([
        {
          trackViewUrl: 'https://music.apple.com/track/other',
          trackName: 'Firelight',
          artistName: 'A Totally Different Band',
          artworkUrl100: 'https://cdn.example.com/other-100x100bb.jpg',
        },
      ])
    );

    const result = await searchSonglink('Firelight', 'The Owls');

    expect(result).toBeNull();
  });

  it('returns null and does not cache on iTunes 500', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 })
    );

    const result = await searchSonglink('Some Uncached Title', 'Some Uncached Artist');
    expect(result).toBeNull();

    // Not cached: a second call must hit fetch again (not return the memoized value directly).
    const secondResult = await searchSonglink('Some Uncached Title', 'Some Uncached Artist');
    expect(secondResult).toBeNull();
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
  });
});
