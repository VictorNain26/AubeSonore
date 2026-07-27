import { describe, it, expect, spyOn, afterEach } from 'bun:test';

const { getArtistLinks, musicbrainzCache } = await import('./musicbrainzService');

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore?.();
  musicbrainzCache.dispose();
});

function relationsResponse(relations: unknown[]): Response {
  return new Response(JSON.stringify({ relations }), {
    headers: { 'content-type': 'application/json' },
  });
}

describe('getArtistLinks', () => {
  it('maps known relation types to platform links', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      relationsResponse([
        { type: 'official homepage', url: { resource: 'https://artist.example' } },
        { type: 'bandcamp', url: { resource: 'https://artist.bandcamp.com' } },
        { type: 'soundcloud', url: { resource: 'https://soundcloud.com/artist' } },
        { type: 'wikipedia', url: { resource: 'https://fr.wikipedia.org/wiki/Artist' } },
      ])
    );

    expect(await getArtistLinks('11111111-1111-1111-1111-111111111111')).toEqual([
      { platform: 'official', url: 'https://artist.example' },
      { platform: 'bandcamp', url: 'https://artist.bandcamp.com' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/artist' },
      { platform: 'wikipedia', url: 'https://fr.wikipedia.org/wiki/Artist' },
    ]);
  });

  it('drops unmapped relation types and non-https urls', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      relationsResponse([
        { type: 'discogs', url: { resource: 'https://discogs.com/artist' } },
        { type: 'bandcamp', url: { resource: 'http://insecure.bandcamp.com' } },
      ])
    );

    expect(await getArtistLinks('22222222-2222-2222-2222-222222222222')).toEqual([]);
  });

  it('sends an identifying User-Agent', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(relationsResponse([]));

    await getArtistLinks('33333333-3333-3333-3333-333333333333');

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get('user-agent')).toContain('AubeSonore');
  });

  it('caches the result so a second call skips upstream', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(relationsResponse([]));
    const mbid = '44444444-4444-4444-4444-444444444444';

    await getArtistLinks(mbid);
    await getArtistLinks(mbid);

    expect(fetchSpy.mock.calls.length).toBe(1);
  });

  it('returns an empty list when upstream fails', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 503 }));

    expect(await getArtistLinks('55555555-5555-5555-5555-555555555555')).toEqual([]);
  });

  it('serialises calls at least a second apart', async () => {
    // A fresh Response per call: a body can only be consumed once.
    spyOn(globalThis, 'fetch').mockImplementation((() =>
      Promise.resolve(relationsResponse([]))) as unknown as typeof fetch);

    const startedAt = Date.now();
    await Promise.all([
      getArtistLinks('66666666-6666-6666-6666-666666666666'),
      getArtistLinks('77777777-7777-7777-7777-777777777777'),
    ]);

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1_000);
  });
});
