import { describe, it, expect, spyOn, afterEach } from 'bun:test';
import type { CoverStore } from '../lib/storage/coverStore';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.BETTER_AUTH_SECRET ??= 'x'.repeat(32);
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';

const { snapshotCover } = await import('./coverService');

const okStore: CoverStore = {
  put: () => Promise.resolve('https://covers.example.com/covers/abc.jpg'),
};

// A public RFC 5737 documentation IP as host so assertSafeUrl takes the
// literal-IP branch and never resolves DNS — keeps the suite hermetic
// (CI runners have no guaranteed outbound DNS).
const SOURCE_URL = 'https://203.0.113.5/art/real.jpg';

function imageResponse(type: string, size: number): Response {
  return new Response(new Uint8Array(size), { headers: { 'content-type': type } });
}

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore?.();
});

describe('snapshotCover', () => {
  it('returns null for AzuraCast default/generic art (no fetch)', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch');
    const result = await snapshotCover('https://example.com/generic_song.jpg', okStore);
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null for a private/SSRF target (no upload)', async () => {
    const result = await snapshotCover('https://127.0.0.1/cover.jpg', okStore);
    expect(result).toBeNull();
  });

  it('returns null when the store is not configured', async () => {
    const result = await snapshotCover(SOURCE_URL, null);
    expect(result).toBeNull();
  });

  it('uploads and returns the R2 URL on a valid image', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(imageResponse('image/jpeg', 1024));
    const result = await snapshotCover(SOURCE_URL, okStore);
    expect(result).toBe('https://covers.example.com/covers/abc.jpg');
  });

  it('returns null for a non-image response', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(imageResponse('text/html', 512));
    const result = await snapshotCover(SOURCE_URL, okStore);
    expect(result).toBeNull();
  });

  it('returns null for an oversized image (> 5 MB)', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(imageResponse('image/jpeg', 6 * 1024 * 1024));
    const result = await snapshotCover(SOURCE_URL, okStore);
    expect(result).toBeNull();
  });

  it('returns null when the source responds 404 (no upload)', async () => {
    const putSpy = spyOn(okStore, 'put');
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    const result = await snapshotCover(SOURCE_URL, okStore);
    expect(result).toBeNull();
    expect(putSpy).not.toHaveBeenCalled();
  });

  it('returns null for a non-raster image type (SVG)', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(imageResponse('image/svg+xml', 512));
    const result = await snapshotCover(SOURCE_URL, okStore);
    expect(result).toBeNull();
  });

  it('returns null when the fetch is rejected by a redirect (redirect: "error")', async () => {
    spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('unexpected redirect'));
    const result = await snapshotCover(SOURCE_URL, okStore);
    expect(result).toBeNull();
  });
});
