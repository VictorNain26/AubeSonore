// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNowPlaying } from './azuracast';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor(public url: string) {
    MockEventSource.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }
  emit(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

afterEach(() => {
  MockEventSource.instances = [];
  vi.unstubAllGlobals();
});

describe('useNowPlaying', () => {
  it('ignores empty ping messages', async () => {
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    const instance = MockEventSource.instances[0];
    if (!instance) throw new Error('No EventSource instance created');
    instance.emit('{}');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('updates data on connect message with publications', async () => {
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    const instance = MockEventSource.instances[0];
    if (!instance) throw new Error('No EventSource instance created');
    const np = {
      station: {},
      listeners: { total: 1, unique: 1, current: 1 },
      live: { is_live: false, streamer_name: '', broadcast_start: null, art: null },
      now_playing: {
        sh_id: 1,
        played_at: 0,
        duration: 100,
        playlist: 'a',
        streamer: '',
        is_request: false,
        song: {
          id: 's',
          art: '',
          text: '',
          artist: 'A',
          title: 'T',
          album: '',
          genre: '',
          isrc: '',
          lyrics: '',
        },
      },
      playing_next: null,
      song_history: [],
      is_online: true,
    };
    instance.emit(
      JSON.stringify({
        connect: { subs: { 'station:aubesonore': { publications: [{ data: { np } }] } } },
      })
    );
    await waitFor(() => expect(result.current.data?.now_playing.song.title).toBe('T'));
  });

  it('logs invalid payload shape and does not update state', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    const instance = MockEventSource.instances[0];
    if (!instance) throw new Error('No EventSource instance created');
    instance.emit(
      JSON.stringify({
        connect: {
          subs: { 'station:aubesonore': { publications: [{ data: { np: { broken: true } } }] } },
        },
      })
    );
    expect(result.current.data).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('useNowPlaying REST fallback', () => {
  it('fetches static endpoint on mount and updates data before SSE', async () => {
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => {
      expect(result.current.data?.now_playing.song.title).toBe('Test Title');
    });
  });

  it('logs info once if static endpoint 404s, does not error', async () => {
    server.use(
      http.get(
        'https://radio.aubesonore.fr/api/nowplaying_static/aubesonore.json',
        () => new HttpResponse(null, { status: 404 })
      )
    );
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(info).toHaveBeenCalled());
    expect(result.current.error).toBeNull();
    info.mockRestore();
  });
});
