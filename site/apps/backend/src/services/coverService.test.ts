import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { createHash } from 'crypto';
import * as realSchema from '../db/schema';

interface StoredCover {
  sha256: string;
  contentType: string;
  bytes: Buffer;
}

let stored: StoredCover[] = [];

const fakeDb = {
  insert: () => ({
    values: (values: StoredCover) => ({
      onConflictDoNothing: () => {
        if (!stored.some((c) => c.sha256 === values.sha256)) stored.push(values);
        return Promise.resolve();
      },
    }),
  }),
  select: () => ({
    from: () => ({
      where: () => ({ limit: () => Promise.resolve(stored.slice(0, 1)) }),
    }),
  }),
};

void mock.module('../db/index', () => ({ db: fakeDb, schema: realSchema }));

const { keepCover } = await import('./coverService');
const { coversRoutes } = await import('../routes/covers.routes');

const ART = 'https://radio.aubesonore.fr/api/station/aubesonore/art/1f6c23e3-1790856695.jpg';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const originalFetch = globalThis.fetch;

function serve(response: Response, seen: string[] = []): void {
  globalThis.fetch = ((url: string) => {
    seen.push(url);
    return Promise.resolve(response);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  stored = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('keepCover', () => {
  it('copies the art from our own AzuraCast and returns the URL of the copy', async () => {
    const seen: string[] = [];
    serve(new Response(JPEG, { headers: { 'content-type': 'image/jpeg' } }), seen);

    const url = await keepCover(ART);

    const sha256 = createHash('sha256').update(JPEG).digest('hex');
    expect(seen).toEqual([
      'http://azuracast.test/api/station/aubesonore/art/1f6c23e3-1790856695.jpg',
    ]);
    expect(url).toBe(`http://localhost:3000/api/covers/${sha256}`);
    expect(stored).toEqual([{ sha256, contentType: 'image/jpeg', bytes: JPEG }]);
  });

  it('keeps nothing when AzuraCast redirects to its generic image', async () => {
    serve(new Response(null, { status: 302, headers: { location: '/static/generic_song.jpg' } }));

    expect(await keepCover(ART)).toBeNull();
    expect(stored).toEqual([]);
  });

  it('never fetches a URL that is not AzuraCast art', async () => {
    const seen: string[] = [];
    serve(new Response(JPEG, { headers: { 'content-type': 'image/jpeg' } }), seen);

    expect(await keepCover('https://is1-ssl.mzstatic.com/image/thumb/a/600x600bb.jpg')).toBeNull();
    expect(await keepCover('not a url')).toBeNull();
    expect(seen).toEqual([]);
  });

  it('refuses what is not an image, and images over 2 MB', async () => {
    serve(new Response('<html>', { headers: { 'content-type': 'text/html' } }));
    expect(await keepCover(ART)).toBeNull();

    serve(
      new Response(Buffer.alloc(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/png' } })
    );
    expect(await keepCover(ART)).toBeNull();
    expect(stored).toEqual([]);
  });

  it('keeps nothing when AzuraCast is unreachable', async () => {
    globalThis.fetch = (() =>
      Promise.reject(new Error('connect ECONNREFUSED'))) as unknown as typeof fetch;

    expect(await keepCover(ART)).toBeNull();
  });
});

describe('GET /api/covers/:sha256', () => {
  it('serves the copy as an immutable image', async () => {
    const sha256 = createHash('sha256').update(JPEG).digest('hex');
    stored = [{ sha256, contentType: 'image/jpeg', bytes: JPEG }];

    const res = await coversRoutes.handle(new Request(`http://localhost/api/covers/${sha256}`));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(Buffer.from(await res.arrayBuffer())).toEqual(JPEG);
  });

  it('answers 404 to an unknown or malformed address', async () => {
    const missing = await coversRoutes.handle(
      new Request(`http://localhost/api/covers/${'0'.repeat(64)}`)
    );
    const malformed = await coversRoutes.handle(new Request('http://localhost/api/covers/../etc'));

    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(404);
  });
});

describe('contracts this service relies on', () => {
  it('node-postgres reads a bytea column as a Buffer', async () => {
    const { types } = await import('pg');
    const parseBytea = types.getTypeParser(17, 'text') as (value: string) => unknown;

    expect(parseBytea('\\x0102ff')).toEqual(Buffer.from([1, 2, 255]));
  });

  it("Bun's fetch hands back AzuraCast's redirect instead of following it", async () => {
    using server = Bun.serve({
      port: 0,
      fetch: () => new Response(null, { status: 302, headers: { location: '/generic_song.jpg' } }),
    });

    const response = await originalFetch(server.url, { redirect: 'manual' });

    expect(response.status).toBe(302);
  });
});
