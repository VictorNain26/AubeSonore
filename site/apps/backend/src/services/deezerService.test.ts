import { describe, it, expect, spyOn, afterEach } from 'bun:test';

const {
  searchArtist,
  getArtist,
  getRelatedArtists,
  getTopTracks,
  deezerCache,
  __resetDeezerCircuit,
} = await import('./deezerService');

const norm = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

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
  it('returns the top hit when its name normalizes to the query', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({ data: [{ id: 27, name: 'Daft Punk', picture_xl: 'https://cdn.deezer.com/dp.jpg' }] })
    );

    const result = await searchArtist('daft punk', norm);

    expect(result).toEqual({
      status: 'match',
      artist: { id: '27', name: 'Daft Punk', picture: 'https://cdn.deezer.com/dp.jpg' },
    });
  });

  it('rejects a top hit whose name differs, however close', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({ data: [{ id: 99, name: 'Daft Punks', picture_xl: null }] })
    );

    expect(await searchArtist('Daft Punk', norm)).toEqual({ status: 'none' });
  });

  it('reports and caches a miss on an empty result set', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [] }));

    expect(await searchArtist('No Such Artist Anywhere', norm)).toEqual({ status: 'none' });
    expect(await searchArtist('No Such Artist Anywhere', norm)).toEqual({ status: 'none' });
    expect(fetchSpy.mock.calls.length).toBe(1);
  });

  it('reports a 500 as a failure, not a miss, and retries next time', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 })
    );

    expect(await searchArtist('Transient Failure Artist', norm)).toEqual({ status: 'failed' });
    expect(await searchArtist('Transient Failure Artist', norm)).toEqual({ status: 'failed' });
    expect(fetchSpy.mock.calls.length).toBe(2);
  });

  it('reports an error body sent with HTTP 200 as a failure', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((() =>
      Promise.resolve(
        json({ error: { type: 'Exception', message: 'Quota limit exceeded', code: 4 } })
      )) as unknown as typeof fetch);

    expect(await searchArtist('Quota Artist', norm)).toEqual({ status: 'failed' });
    expect(await searchArtist('Quota Artist', norm)).toEqual({ status: 'failed' });
    expect(fetchSpy.mock.calls.length).toBe(2);
  });

  it('opens the circuit on 429 and stops calling upstream', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 429 })
    );

    expect(await searchArtist('Rate Limited One', norm)).toEqual({ status: 'failed' });
    const callsAfterFirst = fetchSpy.mock.calls.length;
    expect(await searchArtist('Rate Limited Two', norm)).toEqual({ status: 'failed' });

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
      searchArtist('Air', norm),
      searchArtist('Air', norm),
      searchArtist('Air', norm),
    ]);

    expect(first).toEqual({ status: 'match', artist: { id: '7', name: 'Air', picture: null } });
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(fetchSpy.mock.calls.length).toBe(1);
  });

  it('encodes the artist name into the query string', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ data: [] }));

    await searchArtist('Simon & Garfunkel', norm);

    const requestedUrl = fetchSpy.mock.calls[0]?.[0];
    expect(typeof requestedUrl).toBe('string');
    expect(requestedUrl as string).toContain('Simon%20%26%20Garfunkel');
  });
});

describe('getArtist', () => {
  it('caches the "no data" answer (code 800) as a definitive miss', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { type: 'DataException', message: 'no data', code: 800 } })
    );

    expect(await getArtist('999999999999')).toBeNull();
    expect(await getArtist('999999999999')).toBeNull();
    expect(fetchSpy.mock.calls.length).toBe(1);
  });

  it('retries after any other error body', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((() =>
      Promise.resolve(
        json({ error: { type: 'Exception', message: 'Quota limit exceeded', code: 4 } })
      )) as unknown as typeof fetch);

    expect(await getArtist('27')).toBeNull();
    expect(await getArtist('27')).toBeNull();
    expect(fetchSpy.mock.calls.length).toBe(2);
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
