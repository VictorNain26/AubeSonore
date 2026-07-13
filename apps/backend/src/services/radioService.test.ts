import { describe, it, expect, afterEach } from 'bun:test';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.BETTER_AUTH_SECRET ??= 'x'.repeat(32);
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
process.env.AZURACAST_BASE_URL = 'http://azuracast.test';
process.env.AZURACAST_API_KEY = 'secret-key';
process.env.AZURACAST_STATION_ID = 'aubesonore';

const { getStationHistory, radioHistoryCache } = await import('./radioService');

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  radioHistoryCache.delete('120');
  radioHistoryCache.delete('5');
});

describe('getStationHistory', () => {
  it('fetches AzuraCast history with the API key header and station id in the path', async () => {
    let capturedUrl = '';
    let capturedHeaders: RequestInit['headers'];
    globalThis.fetch = ((url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = init?.headers;
      return Promise.resolve(new Response(JSON.stringify([{ sh_id: 1 }]), { status: 200 }));
    }) as unknown as typeof fetch;

    const result = await getStationHistory(5);

    expect(capturedUrl).toBe(
      'http://azuracast.test/api/station/aubesonore/history?rows=5&per_page=5'
    );
    expect(capturedHeaders).toMatchObject({ 'X-API-Key': 'secret-key' });
    expect(result).toEqual([{ sh_id: 1 }]);
  });

  it('caches the result per rows value for subsequent calls', async () => {
    let calls = 0;
    globalThis.fetch = (() => {
      calls++;
      return Promise.resolve(new Response(JSON.stringify([{ sh_id: calls }]), { status: 200 }));
    }) as unknown as typeof fetch;

    const first = await getStationHistory(5);
    const second = await getStationHistory(5);

    expect(calls).toBe(1);
    expect(second).toEqual(first);
  });

  it('throws on a non-200 AzuraCast response', async () => {
    globalThis.fetch = (() =>
      Promise.resolve(new Response('nope', { status: 403 }))) as unknown as typeof fetch;

    let err: unknown;
    try {
      await getStationHistory(120);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
  });
});
