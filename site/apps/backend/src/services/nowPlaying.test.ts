import { describe, it, expect, spyOn, afterEach } from 'bun:test';

const { fetchNowPlaying } = await import('./nowPlaying');

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore?.();
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
}

describe('fetchNowPlaying', () => {
  it('reads the single object a station endpoint answers', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({
        station: { shortcode: 'aubesonore' },
        now_playing: { sh_id: 4242, song: { title: 'F Major', artist: 'Hania Rani' } },
        song_history: [],
      })
    );

    expect(await fetchNowPlaying()).toEqual({
      sh_id: 4242,
      title: 'F Major',
      artist: 'Hania Rani',
    });
  });

  it('returns null when nothing is on air', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ station: {}, now_playing: null }));

    expect(await fetchNowPlaying()).toBeNull();
  });

  it('throws on an upstream error so the watcher logs the tick', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 503 }));

    const error = await fetchNowPlaying().then(
      () => null,
      (err: unknown) => err
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('503');
  });
});
