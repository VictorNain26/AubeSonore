import { describe, it, expect, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { securityHeaders } from '../lib/security/securityHeaders';
import { artistRoutes } from './artist.routes';

const { shareRoutes } = await import('./share.routes');
const { songlinkCache, itunesCache } = await import('../services/songlinkService');

// Composed like index.ts so the global securityHeaders hook runs: the share
// page must keep its own CSP while JSON routes keep `default-src 'none'`.
const app = new Elysia().use(securityHeaders).use(shareRoutes).use(artistRoutes);

const SHARE_PAGE_CSP = "default-src 'self'; img-src https:; style-src 'unsafe-inline'";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  songlinkCache.dispose();
  itunesCache.dispose();
});

function mockSonglinkSuccess(): void {
  globalThis.fetch = ((url: string) => {
    if (url.startsWith('https://itunes.apple.com/')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            resultCount: 1,
            results: [
              {
                trackViewUrl: 'https://music.apple.com/fr/song/balance-act/1',
                trackName: 'Balance Act',
                artistName: 'Psychic Lines',
                artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/100x100bb.jpg',
              },
            ],
          }),
          { status: 200 }
        )
      );
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({
          entityUniqueId: 'e1',
          userCountry: 'FR',
          pageUrl: 'https://song.link/x',
          linksByPlatform: {
            spotify: { url: 'https://open.spotify.com/track/1', entityUniqueId: 'e1' },
            deezer: { url: 'https://www.deezer.com/track/1', entityUniqueId: 'e1' },
          },
          entitiesByUniqueId: {
            e1: {
              id: '1',
              type: 'song',
              title: 'Balance Act',
              artistName: 'Psychic Lines',
              thumbnailUrl: 'https://assets.song.link/cover.jpg',
              thumbnailWidth: 1400,
              thumbnailHeight: 1400,
              apiProvider: 'spotify',
              platforms: ['spotify'],
            },
          },
        }),
        { status: 200 }
      )
    );
  }) as unknown as typeof fetch;
}

describe('GET /t', () => {
  it('returns 400 when a param is missing', async () => {
    const res = await app.handle(new Request('http://localhost/t?title=Balance%20Act'));

    expect(res.status).toBe(400);
  });

  it('renders an HTML page with title, artist and OG meta', async () => {
    mockSonglinkSuccess();

    const res = await app.handle(
      new Request('http://localhost/t?title=Balance%20Act&artist=Psychic%20Lines')
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
    const html = await res.text();
    expect(html).toContain('<h1>Balance Act</h1>');
    expect(html).toContain('Psychic Lines');
    expect(html).toContain('content="« Balance Act — Psychic Lines »"');
    expect(html).toContain('https://assets.song.link/cover.jpg');
    expect(html).toContain('Écouter sur Spotify');
  });

  it('escapes HTML in title and artist', async () => {
    mockSonglinkSuccess();

    const xssTitle = '<script>alert(1)</script>';
    const res = await app.handle(
      new Request(`http://localhost/t?title=${encodeURIComponent(xssTitle)}&artist=Psychic%20Lines`)
    );

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain(xssTitle);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('still renders the page when the upstream fetch rejects', async () => {
    globalThis.fetch = (() => {
      throw new Error('connect ECONNREFUSED');
    }) as unknown as typeof fetch;

    const res = await app.handle(
      new Request('http://localhost/t?title=Balance%20Act&artist=Psychic%20Lines')
    );

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<h1>Balance Act</h1>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('Écouter sur');
  });

  it('serves the page CSP instead of the API default', async () => {
    mockSonglinkSuccess();

    const res = await app.handle(
      new Request('http://localhost/t?title=Balance%20Act&artist=Psychic%20Lines')
    );

    expect(res.headers.get('content-security-policy')).toBe(SHARE_PAGE_CSP);
  });

  it('keeps the restrictive CSP on JSON routes', async () => {
    const res = await app.handle(new Request('http://localhost/api/artist/resolve'));

    expect(res.status).toBe(400);
    expect(res.headers.get('content-security-policy')).toBe(
      "default-src 'none'; frame-ancestors 'none'"
    );
  });

  it('serves English copy for an English Accept-Language', async () => {
    mockSonglinkSuccess();

    const res = await app.handle(
      new Request('http://localhost/t?title=Balance%20Act&artist=Psychic%20Lines', {
        headers: { 'accept-language': 'en-US,en;q=0.9' },
      })
    );

    const html = await res.text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Listen live');
    expect(html).toContain('Listen on Spotify');
    expect(html).toContain('Heard on AubeSonore');
    expect(res.headers.get('vary')).toContain('accept-language');
  });

  it('serves French copy for French or missing Accept-Language', async () => {
    mockSonglinkSuccess();

    const french = await app.handle(
      new Request('http://localhost/t?title=Balance%20Act&artist=Psychic%20Lines', {
        headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' },
      })
    );
    expect(await french.text()).toContain('Écouter le direct');

    const noHeader = await app.handle(
      new Request('http://localhost/t?title=Balance%20Act&artist=Psychic%20Lines')
    );
    expect(await noHeader.text()).toContain('Écouter le direct');
  });
});
