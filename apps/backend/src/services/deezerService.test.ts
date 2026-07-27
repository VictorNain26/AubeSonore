import { describe, it, expect, spyOn, afterEach } from 'bun:test';

const { searchArtist, getRelatedArtists, getTopTracks, deezerCache, __resetDeezerCircuit } =
  await import('./deezerService');

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore?.();
  deezerCache.dispose();
  __resetDeezerCircuit();
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
}

describe('searchArtist', () => {
  it('returns the top match when the name matches closely', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({ data: [{ id: 27, name: 'Daft Punk', picture_xl: 'https://cdn.deezer.com/dp.jpg' }] })
    );

    const result = await searchArtist('Daft Punk');

    expect(result).toEqual({
      id: '27',
      name: 'Daft Punk',
      picture: 'https://cdn.deezer.com/dp.jpg',
    });
  });

  it('rejects a top match whose name is unrelated to the query', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({ data: [{ id: 99, name: 'Completely Other Band', picture_xl: null }] })
    );

    expect(await searchArtist('Daft Punk')).toBeNull();
  });

  it('returns null and caches the miss on an empty result set', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [] }));

    expect(await searchArtist('No Such Artist Anywhere')).toBeNull();
    expect(await searchArtist('No Such Artist Anywhere')).toBeNull();
    expect(fetchSpy.mock.calls.length).toBe(1);
  });

  it('does not cache a 500 so the next call retries', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 })
    );

    expect(await searchArtist('Transient Failure Artist')).toBeNull();
    expect(await searchArtist('Transient Failure Artist')).toBeNull();
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
  });

  it('opens the circuit on 429 and stops calling upstream', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 429 })
    );

    expect(await searchArtist('Rate Limited One')).toBeNull();
    const callsAfterFirst = fetchSpy.mock.calls.length;
    expect(await searchArtist('Rate Limited Two')).toBeNull();

    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst);
  });

  it('coalesces concurrent identical lookups into one upstream call', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      ((): Promise<Response> =>
        new Promise<Response>((resolve) =>
          setTimeout(() => resolve(json({ data: [{ id: 7, name: 'Air', picture_xl: null }] })), 20)
        )) as unknown as typeof fetch
    );

    const [first, second, third] = await Promise.all([
      searchArtist('Air'),
      searchArtist('Air'),
      searchArtist('Air'),
    ]);

    expect(first).toEqual({ id: '7', name: 'Air', picture: null });
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(fetchSpy.mock.calls.length).toBe(1);
  });

  it('encodes the artist name into the query string', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ data: [] }));

    await searchArtist('Simon & Garfunkel');

    const requestedUrl = fetchSpy.mock.calls[0]?.[0];
    expect(typeof requestedUrl).toBe('string');
    expect(requestedUrl as string).toContain('Simon%20%26%20Garfunkel');
  });
});

describe('getRelatedArtists', () => {
  it('maps related artists and keeps their pictures', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({
        data: [
          { id: 1, name: 'Justice', picture_xl: 'https://cdn.deezer.com/j.jpg' },
          { id: 2, name: 'Air', picture_xl: null },
        ],
      })
    );

    expect(await getRelatedArtists('27')).toEqual([
      { id: '1', name: 'Justice', picture: 'https://cdn.deezer.com/j.jpg' },
      { id: '2', name: 'Air', picture: null },
    ]);
  });

  it('returns an empty list when upstream fails', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 502 }));

    expect(await getRelatedArtists('27')).toEqual([]);
  });
});

describe('getTopTracks', () => {
  it('keeps only entries that carry both a title and a link', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({
        data: [
          { title: 'Around the World', link: 'https://deezer.com/track/1' },
          { title: 'Missing link' },
        ],
      })
    );

    expect(await getTopTracks('27')).toEqual([
      { title: 'Around the World', link: 'https://deezer.com/track/1' },
    ]);
  });
});
