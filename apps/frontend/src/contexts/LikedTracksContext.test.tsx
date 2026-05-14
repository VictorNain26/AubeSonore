// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { LikedTracksProvider, useLikedTracksContext } from './LikedTracksContext';
import { AuthProvider } from '../components/AuthProvider';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LikedTracksProvider>{children}</LikedTracksProvider>
    </AuthProvider>
  );
}

const authedSession = () =>
  http.get('http://localhost:3000/api/auth/get-session', () =>
    HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
  );

describe('LikedTracksContext optimistic updates', () => {
  it('rolls back optimistic like on server error', async () => {
    server.use(
      authedSession(),
      http.post(
        'http://localhost:3000/api/track/like',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    const { result } = renderHook(() => ({ liked: useLikedTracksContext(), auth: useAuth() }), {
      wrapper,
    });
    // Wait for auth to settle as authenticated, then for the initial fetch to complete
    await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true));
    await waitFor(() => expect(result.current.liked.isLoading).toBe(false));

    await act(async () => {
      await result.current.liked.likeTrack({
        title: 'T',
        artist: 'A',
        youtubeUrl: 'https://youtube.com/x',
      });
    });

    // Optimistic track was removed after failure
    expect(result.current.liked.tracks.length).toBe(0);
    expect(result.current.liked.error).not.toBeNull();
  });

  it('keeps optimistic track on success and replaces temp id with server id', async () => {
    server.use(authedSession());
    const { result } = renderHook(() => ({ liked: useLikedTracksContext(), auth: useAuth() }), {
      wrapper,
    });
    // Wait for auth to settle as authenticated, then for the initial fetch to complete
    await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true));
    await waitFor(() => expect(result.current.liked.isLoading).toBe(false));

    await act(async () => {
      await result.current.liked.likeTrack({
        title: 'T',
        artist: 'A',
        youtubeUrl: 'https://youtube.com/x',
      });
    });

    // Server-side id 't1' (from default handler)
    expect(result.current.liked.tracks).toHaveLength(1);
    expect(result.current.liked.tracks[0]?.id).toBe('t1');
    expect(result.current.liked.tracks[0]?.title).toBe('T');
  });

  it('rolls back optimistic unlike on server error', async () => {
    server.use(
      authedSession(),
      // Initial list has one track
      http.get('http://localhost:3000/api/track/like', () =>
        HttpResponse.json([
          {
            id: 'existing-1',
            userId: 'u1',
            title: 'Persist',
            artist: 'P',
            album: null,
            artworkUrl: null,
            youtubeUrl: 'https://y/x',
            isrc: null,
            songlinkUrl: null,
            platformLinks: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ])
      ),
      http.delete(
        'http://localhost:3000/api/track/like/existing-1',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    const { result } = renderHook(() => useLikedTracksContext(), { wrapper });
    await waitFor(() => expect(result.current.tracks.length).toBe(1));

    await act(async () => {
      await result.current.unlikeTrack('existing-1');
    });

    // Restored after failure
    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0]?.id).toBe('existing-1');
    expect(result.current.error).not.toBeNull();
  });

  it('isTrackLiked returns true for case-insensitive match', async () => {
    server.use(
      authedSession(),
      http.get('http://localhost:3000/api/track/like', () =>
        HttpResponse.json([
          {
            id: 'existing-1',
            userId: 'u1',
            title: 'Hello World',
            artist: 'Artist Name',
            album: null,
            artworkUrl: null,
            youtubeUrl: 'https://y/x',
            isrc: null,
            songlinkUrl: null,
            platformLinks: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ])
      )
    );
    const { result } = renderHook(() => useLikedTracksContext(), { wrapper });
    await waitFor(() => expect(result.current.tracks.length).toBe(1));

    expect(result.current.isTrackLiked('hello world', 'artist name')).toBe(true);
    expect(result.current.isTrackLiked('HELLO WORLD', 'ARTIST NAME')).toBe(true);
    expect(result.current.isTrackLiked('Other Track', 'Other Artist')).toBe(false);
  });

  it('clears tracks when user signs out', async () => {
    server.use(
      authedSession(),
      http.get('http://localhost:3000/api/track/like', () =>
        HttpResponse.json([
          {
            id: 'existing-1',
            userId: 'u1',
            title: 'T',
            artist: 'A',
            album: null,
            artworkUrl: null,
            youtubeUrl: 'https://y/x',
            isrc: null,
            songlinkUrl: null,
            platformLinks: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ])
      )
    );

    const { result } = renderHook(() => ({ liked: useLikedTracksContext(), auth: useAuth() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.liked.tracks.length).toBe(1));

    // Switch session to unauthenticated before sign-out flushes
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: null })
      )
    );

    await act(async () => {
      await result.current.auth.signOut();
    });

    // Context clears tracks on auth → unauth transition
    expect(result.current.liked.tracks).toHaveLength(0);
  });
});
