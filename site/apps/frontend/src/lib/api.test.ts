import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('authApi.signInWithProvider', () => {
  let location: { origin: string; href: string };

  beforeEach(() => {
    location = { origin: 'http://localhost:3000', href: '' };
    vi.stubGlobal('window', { location });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects the browser to the provider authorize URL', async () => {
    const authorizeUrl = 'https://accounts.google.com/o/oauth2/auth?client_id=x';
    let receivedBody: unknown;
    server.use(
      http.post('http://localhost:3000/api/auth/sign-in/social', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ url: authorizeUrl });
      })
    );

    await authApi.signInWithProvider('google');

    expect(receivedBody).toEqual({ provider: 'google', callbackURL: 'http://localhost:3000' });
    expect(location.href).toBe(authorizeUrl);
  });

  it('throws when the response has no redirect URL', async () => {
    server.use(
      http.post('http://localhost:3000/api/auth/sign-in/social', () => HttpResponse.json({}))
    );
    await expect(authApi.signInWithProvider('google')).rejects.toThrow(
      'URL de redirection manquante'
    );
    expect(location.href).toBe('');
  });

  it('surfaces the server error message on failure', async () => {
    server.use(
      http.post('http://localhost:3000/api/auth/sign-in/social', () =>
        HttpResponse.json({ message: 'Provider not configured' }, { status: 400 })
      )
    );
    await expect(authApi.signInWithProvider('google')).rejects.toThrow('Provider not configured');
  });

  it('falls back to a default message when the error body is not JSON', async () => {
    server.use(
      http.post(
        'http://localhost:3000/api/auth/sign-in/social',
        () => new HttpResponse('upstream down', { status: 502 })
      )
    );
    await expect(authApi.signInWithProvider('google')).rejects.toThrow('Erreur connexion');
  });
});
