import { describe, it, expect, spyOn, afterEach, beforeEach } from 'bun:test';
// Real MusicBrainz answers (2026-10-02), relations trimmed to the types the service reads.
import group from './__fixtures__/musicbrainz-artist-group.json';
import person from './__fixtures__/musicbrainz-artist-person.json';
import deezerUrl from './__fixtures__/musicbrainz-url-deezer.json';

const { findMbidByDeezerId, getArtistByMbid, musicbrainzCache, __resetMusicbrainzThrottle } =
  await import('./musicbrainzService');

beforeEach(() => {
  __resetMusicbrainzThrottle();
});

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore?.();
  musicbrainzCache.dispose();
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('findMbidByDeezerId', () => {
  it('returns the artist whose page declares the Deezer link', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(deezerUrl));

    expect(await findMbidByDeezerId('27')).toEqual({
      status: 'found',
      value: '056e4f3e-d505-4dad-8ec1-d04f521cbb56',
    });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(encodeURIComponent('https://www.deezer.com/artist/27'));
    expect(new Headers(init.headers).get('user-agent')).toContain('AubeSonore');
  });

  it('binds no artist when two of them share the Deezer page', async () => {
    const [relation] = deezerUrl.relations;
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({
        ...deezerUrl,
        relations: [relation, { ...relation, artist: { ...relation?.artist, id: 'other' } }],
      })
    );

    expect(await findMbidByDeezerId('27')).toEqual({ status: 'none' });
  });

  it('caches an unknown link, retries after a failure', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error: 'Not Found' }, 404))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(json(deezerUrl));

    expect(await findMbidByDeezerId('1')).toEqual({ status: 'none' });
    expect(await findMbidByDeezerId('1')).toEqual({ status: 'none' });
    expect(fetchSpy.mock.calls.length).toBe(1);

    expect(await findMbidByDeezerId('2')).toEqual({ status: 'failed' });
    expect((await findMbidByDeezerId('2')).status).toBe('found');
  });
});

describe('getArtistByMbid', () => {
  it('reads a group: where and when it formed, one link per platform, https only, site last', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(group));

    expect(await getArtistByMbid(group.id)).toEqual({
      status: 'found',
      value: {
        facts: {
          kind: 'group',
          place: 'Paris',
          country: 'FR',
          formed: 1993,
          ended: 2021,
          active: false,
        },
        links: [
          { platform: 'spotify', url: 'https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi' },
          { platform: 'appleMusic', url: 'https://music.apple.com/fr/artist/5468295' },
          { platform: 'soundcloud', url: 'https://soundcloud.com/daftpunkofficialmusic' },
          { platform: 'official', url: 'https://daftpunk.com/' },
        ],
        wikidataId: 'Q185828',
      },
    });
  });

  it('never reads a birth as a career for a person', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(person));

    const found = await getArtistByMbid(person.id);

    expect(found.status === 'found' && found.value.facts).toEqual({
      kind: 'person',
      place: null,
      country: 'GB',
      formed: null,
      ended: null,
      active: false,
    });
  });
});
