import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { AuthInit } from './components/AuthInit';
import { useAuthStore } from './stores/authStore';

// Test wrapper: mounts <AuthInit /> so any component under test sees the
// same session-hydration behavior as production. Resets the global auth
// store first so tests don't leak state into each other. Pages link through
// the router, so a MemoryRouter wraps every tree.

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
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
