import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { AuthInit } from './components/AuthInit';
import { useAuthStore } from './stores/authStore';

// Test wrapper: mounts <AuthInit /> so any component under test sees the
// same session-hydration behavior as production. Resets the global auth
// store first so tests don't leak state into each other.
// The router is part of that parity: App wraps everything in BrowserRouter,
// and anything reaching useLikeAction ends up calling useNavigate.

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AuthInit />
      {children}
    </MemoryRouter>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  useAuthStore.setState({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    authError: null,
  });
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
