import { describe, it, expect } from 'bun:test';
import type { CoverBucket } from './coverStore';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.BETTER_AUTH_SECRET ??= 'x'.repeat(32);
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';

const { createCoverStore } = await import('./coverStore');

function fakeBucket() {
  const written = new Map<string, { data: Uint8Array; type: string }>();
  const bucket: CoverBucket = {
    file(key) {
      return {
        exists: () => Promise.resolve(written.has(key)),
        write: (data, options: { type: string }) => {
          written.set(key, { data, type: options.type });
          return Promise.resolve(undefined);
        },
      };
    },
  };
  return { bucket, written };
}

const bytes = new TextEncoder().encode('fake-jpeg-bytes');

describe('createCoverStore', () => {
  it('uploads under a content-addressed key and returns the public URL', async () => {
    const { bucket, written } = fakeBucket();
    const store = createCoverStore(bucket, 'https://covers.example.com/');
    const url = await store.put(bytes, 'image/jpeg');

    expect(url).toMatch(/^https:\/\/covers\.example\.com\/covers\/[0-9a-f]{64}\.jpg$/);
    expect(written.size).toBe(1);
  });

  it('is idempotent: identical bytes are not re-uploaded', async () => {
    const { bucket } = fakeBucket();
    const store = createCoverStore(bucket, 'https://covers.example.com');
    const first = await store.put(bytes, 'image/jpeg');
    const second = await store.put(bytes, 'image/jpeg');
    expect(first).toBe(second);
  });

  it('maps content-type to the file extension', async () => {
    const { bucket } = fakeBucket();
    const store = createCoverStore(bucket, 'https://covers.example.com');
    const url = await store.put(bytes, 'image/png');
    expect(url.endsWith('.png')).toBe(true);
  });
});
