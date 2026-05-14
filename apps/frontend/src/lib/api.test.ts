import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { authApi } from './api';

describe('authApi.getSession', () => {
  it('returns null when no session (401)', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: null }, { status: 401 })
      )
    );
    const result = await authApi.getSession();
    expect(result).toBeNull();
  });

  it('returns user when session valid', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'x@y.z', name: 'X' } })
      )
    );
    const result = await authApi.getSession();
    expect(result?.user.id).toBe('u1');
  });

  it('throws on network error', async () => {
    server.use(http.get('http://localhost:3000/api/auth/get-session', () => HttpResponse.error()));
    await expect(authApi.getSession()).rejects.toThrow();
  });

  it('throws on 500', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 })
      )
    );
    await expect(authApi.getSession()).rejects.toThrow();
  });
});
