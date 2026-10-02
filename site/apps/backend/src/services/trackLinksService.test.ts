import { describe, it, expect, afterEach } from 'bun:test';

const { findTrackLinks, linksCache, itunesCache } = await import('./trackLinksService');

const originalFetch = globalThis.fetch;
let calls: string[] = [];

afterEach(() => {
  globalThis.fetch = originalFetch;
  linksCache.dispose();
  itunesCache.dispose();
  calls = [];
});

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const ITUNES = {
  results: [
    {
      trackViewUrl: 'https://music.apple.com/fr/song/in-flight/1',
      trackName: 'In Flight',
      artistName: 'Sunflower Bean',
      artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/a/100x100bb.jpg',
    },
  ],
};
const DEEZER_SEARCH = {
  data: [
    {
      id: 1616626132,
      title: 'In Flight',
      link: 'https://www.deezer.com/track/1616626132',
      artist: { name: 'Sunflower Bean' },
    },
  ],
};

/** Answers like each platform; `spotify` overrides the Spotify search answer. */
function platforms(spotify?: () => Promise<Response>): void {
  globalThis.fetch = ((url: string) => {
    calls.push(url);
    if (url.startsWith('https://itunes.apple.com/')) return json(ITUNES);
    if (url.startsWith('https://api.deezer.com/search')) return json(DEEZER_SEARCH);
    if (url.startsWith('https://api.deezer.com/track/')) return json({ isrc: 'USQE92100206' });
    if (url.startsWith('https://accounts.spotify.com/'))
      return json({ access_token: 't', expires_in: 3600 });
    if (url.startsWith('https://api.spotify.com/v1/search'))
      return spotify
        ? spotify()
        : json({
            tracks: {
              items: [{ external_urls: { spotify: 'https://open.spotify.com/track/s1' } }],
            },
          });
    throw new Error(`unexpected ${url}`);
  }) as unknown as typeof fetch;
}

describe('findTrackLinks', () => {
  it('links the track on Spotify (by ISRC), Apple Music and Deezer, with its cover', async () => {
    platforms();

    const links = await findTrackLinks('In Flight', 'Sunflower Bean');

    expect(links).toEqual({
      platformLinks: {
        spotify: 'https://open.spotify.com/track/s1',
        appleMusic: 'https://music.apple.com/fr/song/in-flight/1',
        deezer: 'https://www.deezer.com/track/1616626132',
      },
      songlinkUrl: 'https://song.link/https://www.deezer.com/track/1616626132',
      artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/a/600x600bb.jpg',
    });
    expect(calls.some((u) => u.includes(encodeURIComponent('isrc:USQE92100206')))).toBe(true);
  });

  it('keeps the other links when Spotify refuses (owner without Premium), and retries later', async () => {
    platforms(() =>
      Promise.resolve(
        new Response('Active premium subscription required for the owner of the app.', {
          status: 403,
        })
      )
    );

    const first = await findTrackLinks('In Flight', 'Sunflower Bean');
    expect(first?.platformLinks).toEqual({
      appleMusic: 'https://music.apple.com/fr/song/in-flight/1',
      deezer: 'https://www.deezer.com/track/1616626132',
    });

    calls = [];
    await findTrackLinks('In Flight', 'Sunflower Bean');
    expect(calls.length).toBeGreaterThan(0);
  });

  it('never links another artist that Deezer or iTunes return', async () => {
    globalThis.fetch = ((url: string) => {
      if (url.startsWith('https://itunes.apple.com/'))
        return json({ results: [{ ...ITUNES.results[0], artistName: 'Somebody Else' }] });
      if (url.startsWith('https://api.deezer.com/search'))
        return json({ data: [{ ...DEEZER_SEARCH.data[0], artist: { name: 'Somebody Else' } }] });
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;

    expect(await findTrackLinks('In Flight', 'Sunflower Bean')).toBeNull();
  });

  it('does not cache an answer cut short by a network failure', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('ECONNRESET'))) as unknown as typeof fetch;
    expect(await findTrackLinks('In Flight', 'Sunflower Bean')).toBeNull();

    platforms();
    expect((await findTrackLinks('In Flight', 'Sunflower Bean'))?.platformLinks.deezer).toBe(
      'https://www.deezer.com/track/1616626132'
    );
  });
});
