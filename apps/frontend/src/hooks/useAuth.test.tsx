// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthState } from './useAuth';

describe('useAuthState', () => {
  it('starts in loading=true', () => {
    const { result } = renderHook(() => useAuthState());
    expect(result.current.isLoading).toBe(true);
  });

  it('loads session on mount when present', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      )
    );
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('u1');
    expect(result.current.authError).toBeNull();
  });

  it('signIn updates state to authenticated', async () => {
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.signIn('a@b.c', 'pw'));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('signOut clears user', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      )
    );
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(() => result.current.signOut());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('sets authError on network error', async () => {
    server.use(http.get('http://localhost:3000/api/auth/get-session', () => HttpResponse.error()));
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.authError).not.toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
