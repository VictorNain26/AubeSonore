import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { resolveArtistPath } from './artistProfile';

describe('resolveArtistPath', () => {
  it('turns a raw artist name into the canonical page path', async () => {
    expect(await resolveArtistPath('Simon & Garfunkel')).toBe('/artist/art_1/simon-garfunkel');
  });

  it('returns null when the artist cannot be resolved', async () => {
    expect(await resolveArtistPath('Unknown')).toBeNull();
  });

  it('does not call the API for a blank name', async () => {
    let called = false;
    server.use(
      http.get('http://localhost:3000/api/artist/resolve', () => {
        called = true;
        return new HttpResponse(null, { status: 404 });
      })
    );

    expect(await resolveArtistPath('   ')).toBeNull();
    expect(called).toBe(false);
  });
});
