// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { usePreferences } from './usePreferences';
import { AuthProvider } from '../components/AuthProvider';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('usePreferences', () => {
  it('returns null preferences when not authenticated', async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preferences).toBeNull();
  });

  it('loads preferences when user transitions to authenticated', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      )
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.preferences).not.toBeNull(), { timeout: 2000 });
    expect(result.current.preferences?.preferredPlatform).toBe('spotify');
  });

  it('updatePlatform calls API and updates state', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      )
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.preferences).not.toBeNull(), { timeout: 2000 });
    let ok = false;
    await act(async () => {
      ok = await result.current.updatePlatform('deezer');
    });
    expect(ok).toBe(true);
  });

  it('updatePlatform returns false when not authenticated', async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.updatePlatform('deezer');
    });
    expect(ok).toBe(false);
  });
});
