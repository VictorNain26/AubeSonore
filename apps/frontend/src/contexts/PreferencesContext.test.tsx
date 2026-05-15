// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { AuthProvider } from './AuthContext';
import { PreferencesProvider, usePreferences } from './PreferencesContext';
import type { ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </AuthProvider>
  );
}

function Probe() {
  const { preferences, isLoading, updatePlatform } = usePreferences();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'yes' : 'no'}</span>
      <span data-testid="platform">{preferences?.preferredPlatform ?? 'null'}</span>
      <button
        type="button"
        onClick={() => {
          void updatePlatform('deezer');
        }}
      >
        switch
      </button>
    </div>
  );
}

describe('PreferencesContext', () => {
  it('exposes null preferences when not authenticated', async () => {
    render(
      <Wrapper>
        <Probe />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'));
    expect(screen.getByTestId('platform').textContent).toBe('null');
  });

  it('loads preferences once auth transitions to true', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      )
    );
    render(
      <Wrapper>
        <Probe />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByTestId('platform').textContent).toBe('spotify'), {
      timeout: 2000,
    });
  });

  it('updatePlatform updates the shared state for every consumer', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      ),
      http.put('http://localhost:3000/api/preferences', () =>
        HttpResponse.json({
          preferences: { id: 'p1', userId: 'u1', preferredPlatform: 'deezer' },
        })
      )
    );
    render(
      <Wrapper>
        <Probe />
        <Probe />
      </Wrapper>
    );
    await waitFor(() => {
      const platforms = screen.getAllByTestId('platform');
      expect(platforms[0]?.textContent).toBe('spotify');
      expect(platforms[1]?.textContent).toBe('spotify');
    });

    await userEvent.click(screen.getAllByText('switch')[0]!);

    await waitFor(() => {
      const platforms = screen.getAllByTestId('platform');
      expect(platforms[0]?.textContent).toBe('deezer');
      // Both consumers receive the same state — proves the context is shared,
      // not the previous behaviour where each useHook had its own copy.
      expect(platforms[1]?.textContent).toBe('deezer');
    });
  });

  it('updatePlatform is a no-op (returns false) when not authenticated', async () => {
    let captured: boolean | undefined;
    function Trigger() {
      const { updatePlatform } = usePreferences();
      return (
        <button
          type="button"
          onClick={() => {
            void updatePlatform('deezer').then((r) => {
              captured = r;
            });
          }}
        >
          go
        </button>
      );
    }
    render(
      <Wrapper>
        <Trigger />
      </Wrapper>
    );
    await userEvent.click(screen.getByText('go'));
    await waitFor(() => expect(captured).toBe(false));
  });

  it('throws when used outside its Provider', () => {
    const original = console.error;
    console.error = () => undefined;
    try {
      expect(() => render(<Probe />)).toThrow(/PreferencesProvider/);
    } finally {
      console.error = original;
    }
  });
});
