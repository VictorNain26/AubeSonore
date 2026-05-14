// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useArtistInfo } from './useArtistInfo';

afterEach(() => {
  vi.useRealTimers();
});

describe('useArtistInfo', () => {
  it('fetches artist data when name provided', async () => {
    const { result } = renderHook(() => useArtistInfo('Test Artist'));
    await waitFor(() => expect(result.current.data).not.toBeNull(), { timeout: 2000 });
    expect(result.current.data?.name).toBe('Test Artist');
  });

  it('returns null for 404 (Unknown artist)', async () => {
    const { result } = renderHook(() => useArtistInfo('Unknown'));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 2000 });
    expect(result.current.data).toBeNull();
  });

  it('does not fetch when name is empty string', async () => {
    let called = false;
    server.use(
      http.get('http://localhost:3000/api/artist', () => {
        called = true;
        return HttpResponse.json({});
      })
    );
    renderHook(() => useArtistInfo(''));
    await new Promise((r) => setTimeout(r, 500));
    expect(called).toBe(false);
  });

  it('does not fetch when name is undefined', async () => {
    let called = false;
    server.use(
      http.get('http://localhost:3000/api/artist', () => {
        called = true;
        return HttpResponse.json({});
      })
    );
    renderHook(() => useArtistInfo(undefined));
    await new Promise((r) => setTimeout(r, 500));
    expect(called).toBe(false);
  });
});
