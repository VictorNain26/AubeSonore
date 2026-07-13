// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { makeNowPlaying } from '../mocks/handlers';
import { useNowPlayingStore, __resetNowPlayingStore } from '../lib/azuracast';
import type { NowPlaying, SongEntry } from '../lib/azuracast';
import { useDayHistory } from './useDayHistory';

const HISTORY_URL = 'https://radio.aubesonore.fr/api/station/aubesonore/history';

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
});

afterEach(() => {
  __resetNowPlayingStore();
});

describe('useDayHistory', () => {
  it('fetches once on mount and merges fetched + live history deduped by sh_id', async () => {
    const now = Math.floor(Date.now() / 1000);
    let calls = 0;
    server.use(
      http.get(HISTORY_URL, () => {
        calls++;
        return HttpResponse.json([historyEntry(1, now - 100), historyEntry(2, now - 200)]);
      })
    );
    const np = makeNowPlaying() as unknown as NowPlaying;
    np.song_history = [historyEntry(2, now - 200), historyEntry(3, now - 50)];
    useNowPlayingStore.setState({ data: np, isConnected: true, error: null });

    const { result } = renderHook(() => useDayHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(calls).toBe(1);
    expect(result.current.entries.map((e) => e.sh_id).sort()).toEqual([1, 2, 3]);
    expect(result.current.error).toBeNull();
  });

  it('transitions isLoading from true to false once the fetch resolves', async () => {
    server.use(http.get(HISTORY_URL, () => HttpResponse.json([])));

    const { result } = renderHook(() => useDayHistory());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('sets error on fetch failure but still returns live entries', async () => {
    server.use(http.get(HISTORY_URL, () => new HttpResponse(null, { status: 500 })));
    const now = Math.floor(Date.now() / 1000);
    const np = makeNowPlaying() as unknown as NowPlaying;
    np.song_history = [historyEntry(9, now - 30)];
    useNowPlayingStore.setState({ data: np, isConnected: true, error: null });

    const { result } = renderHook(() => useDayHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('HTTP 500');
    expect(result.current.entries.map((e) => e.sh_id)).toEqual([9]);
  });
});
