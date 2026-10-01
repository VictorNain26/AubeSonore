// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { usePreferencesStore } from './preferencesStore';

beforeEach(() => {
  usePreferencesStore.setState({ preferences: null, isLoading: false, error: null });
});

describe('preferencesStore', () => {
  it('refresh() loads preferences from the API', async () => {
    await usePreferencesStore.getState().refresh();
    expect(usePreferencesStore.getState().preferences?.preferredPlatform).toBe('spotify');
    expect(usePreferencesStore.getState().isLoading).toBe(false);
  });

  it('refresh() resets to null on server error', async () => {
    server.use(
      http.get(
        'http://localhost:3000/api/preferences',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    await usePreferencesStore.getState().refresh();
    expect(usePreferencesStore.getState().preferences).toBeNull();
    expect(usePreferencesStore.getState().isLoading).toBe(false);
  });

  it('updatePlatform() persists the new platform', async () => {
    server.use(
      http.put('http://localhost:3000/api/preferences', () =>
        HttpResponse.json({
          preferences: {
            userId: 'u1',
            preferredPlatform: 'deezer',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        })
      )
    );
    const ok = await usePreferencesStore.getState().updatePlatform('deezer');
    expect(ok).toBe(true);
    expect(usePreferencesStore.getState().preferences?.preferredPlatform).toBe('deezer');
  });

  it('updatePlatform() returns false and sets error on server failure', async () => {
    server.use(
      http.put(
        'http://localhost:3000/api/preferences',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    const ok = await usePreferencesStore.getState().updatePlatform('deezer');
    expect(ok).toBe(false);
    expect(usePreferencesStore.getState().error).not.toBeNull();
  });

  it('clear() wipes preferences and error', () => {
    usePreferencesStore.setState({
      preferences: {
        userId: 'u1',
        preferredPlatform: 'spotify',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      error: 'something',
    });
    usePreferencesStore.getState().clear();
    expect(usePreferencesStore.getState().preferences).toBeNull();
    expect(usePreferencesStore.getState().error).toBeNull();
  });
});
