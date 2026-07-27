import { describe, it, expect, mock, afterEach } from 'bun:test';
import { Elysia } from 'elysia';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const UNKNOWN_ID = '22222222-2222-2222-2222-222222222222';

const SHELL =
  '<!doctype html><html lang="fr"><head><title>AubeSonore</title></head><body><div id="root"></div></body></html>';

let profileName = 'Daft Punk';
let profileImage: string | null = 'https://cdn-images.dzcdn.net/images/artist/dp.jpg';

void mock.module('../services/artistProfileService', () => ({
  getArtistProfile: (id: string) =>
    Promise.resolve(
      id === VALID_ID
        ? {
            id: VALID_ID,
            name: profileName,
            slug: 'daft-punk',
            image: profileImage,
            bio: 'Un duo français.',
            tags: [],
            listeners: null,
            similar: [],
            topTracks: [],
            links: [],
            playedOnRadio: [],
            resolved: true,
          }
        : null
    ),
}));

const { artistPageRoutes, artistShellCache } = await import('./artistPage.routes');
const { __resetRateLimits } = await import('../lib/rateLimit');

const originalFetch = globalThis.fetch;
const app = new Elysia().use(artistPageRoutes);

afterEach(() => {
  globalThis.fetch = originalFetch;
  artistShellCache.dispose();
  __resetRateLimits();
  profileName = 'Daft Punk';
  profileImage = 'https://cdn-images.dzcdn.net/images/artist/dp.jpg';
});

function mockShell(): void {
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(SHELL, { headers: { 'content-type': 'text/html' } })
    )) as unknown as typeof fetch;
}

describe('GET /artist/:id', () => {
  it('injects Open Graph tags into the shell', async () => {
    mockShell();

    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('property="og:title"');
    expect(html).toContain('Daft Punk');
    expect(html).toContain('content="https://cdn-images.dzcdn.net/images/artist/dp.jpg"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('<div id="root">');
  });

  it('serves the same tags on the slug-decorated url', async () => {
    mockShell();

    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}/daft-punk`));

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('property="og:title"');
  });

  it('escapes an artist name containing markup', async () => {
    mockShell();
    profileName = '<script>alert(1)</script>';

    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));

    const html = await res.text();
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('drops an og:image that is not on an allowed host', async () => {
    mockShell();
    profileImage = 'https://evil.example/pwn.jpg';

    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));

    expect(await res.text()).not.toContain('evil.example');
  });

  it('drops a non-https og:image', async () => {
    mockShell();
    profileImage = 'http://cdn-images.dzcdn.net/images/artist/dp.jpg';

    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));

    expect(await res.text()).not.toContain('og:image');
  });

  it('returns 400 on a malformed id', async () => {
    mockShell();

    const res = await app.handle(new Request('http://localhost/artist/not-a-uuid'));

    expect(res.status).toBe(400);
  });

  it('serves the untouched shell when the artist is unknown', async () => {
    mockShell();

    const res = await app.handle(new Request(`http://localhost/artist/${UNKNOWN_ID}`));

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div id="root">');
    expect(html).not.toContain('og:title');
  });

  it('returns 502 when the frontend shell cannot be read', async () => {
    globalThis.fetch = (() =>
      Promise.resolve(new Response(null, { status: 500 }))) as unknown as typeof fetch;

    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));

    expect(res.status).toBe(502);
  });

  it('caches the rendered page so a second hit skips the profile lookup', async () => {
    mockShell();

    await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));
    profileName = 'Changed After Caching';
    const res = await app.handle(new Request(`http://localhost/artist/${VALID_ID}`));

    expect(await res.text()).toContain('Daft Punk');
  });
});
