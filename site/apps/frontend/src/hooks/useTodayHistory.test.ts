// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { makeNowPlaying } from '../mocks/handlers';
import { useNowPlayingStore, __resetNowPlayingStore } from '../lib/azuracast';
import type { NowPlaying, SongEntry } from '../lib/azuracast';
import { useTodayHistory } from './useTodayHistory';

const HISTORY_URL = 'http://localhost:3000/api/radio/history';

function historyEntry(sh_id: number, playedAt: number): SongEntry {
  return {
    sh_id,
    played_at: playedAt,
    duration: 200,
    playlist: 'main',
    streamer: '',
    is_request: false,
    song: {
      id: String(sh_id),
      art: '',
      text: '',
      artist: 'Artist',
      title: `Track ${sh_id}`,
      album: '',
      genre: '',
      isrc: '',
      lyrics: '',
    },
  };
}

beforeEach(() => {
  __resetNowPlayingStore();
  // Noon: entries a few minutes old stay "today" (just after midnight they
  // fell on the day before and the test failed). Only Date is faked: the
  // fetch and waitFor timers keep running.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 2, 12, 0) });
});

afterEach(() => {
  vi.useRealTimers();
  __resetNowPlayingStore();
});

describe('useTodayHistory', () => {
  it('fetches the day once and merges it with the live history, deduped by sh_id', async () => {
    const now = Math.floor(Date.now() / 1000);
    let calls = 0;
    let requested = '';
    server.use(
      http.get(HISTORY_URL, ({ request }) => {
        calls++;
        requested = request.url;
        return HttpResponse.json([historyEntry(1, now - 100), historyEntry(2, now - 200)]);
      })
    );
    const np = makeNowPlaying() as unknown as NowPlaying;
    np.now_playing = historyEntry(5, now - 10);
    np.song_history = [historyEntry(2, now - 200), historyEntry(3, now - 50)];
    useNowPlayingStore.setState({ data: np, isConnected: true, error: null });

    const { result } = renderHook(() => useTodayHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(calls).toBe(1);
    expect(requested).toContain('rows=400');
    expect(result.current.entries.map((e) => e.sh_id)).toEqual([5, 3, 1, 2]);
    expect(result.current.error).toBeNull();
  });

  it('keeps only the tracks played today', async () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const startOfDay = Math.floor(midnight.getTime() / 1000);
    server.use(
      http.get(HISTORY_URL, () =>
        HttpResponse.json([historyEntry(1, startOfDay + 60), historyEntry(2, startOfDay - 60)])
      )
    );

    const { result } = renderHook(() => useTodayHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries.map((e) => e.sh_id)).toEqual([1]);
  });

  it('sets error on fetch failure but still returns live entries', async () => {
    server.use(http.get(HISTORY_URL, () => new HttpResponse(null, { status: 500 })));
    const now = Math.floor(Date.now() / 1000);
    const np = makeNowPlaying() as unknown as NowPlaying;
    np.now_playing = historyEntry(8, now - 10);
    np.song_history = [historyEntry(9, now - 300)];
    useNowPlayingStore.setState({ data: np, isConnected: true, error: null });

    const { result } = renderHook(() => useTodayHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('HTTP 500');
    expect(result.current.entries.map((e) => e.sh_id)).toEqual([8, 9]);
  });
});
