import { render, type RenderOptions } from '@testing-library/react';
import { AuthProvider } from './contexts/AuthContext';
import { LikedTracksProvider } from './contexts/LikedTracksContext';
import type { ReactElement, ReactNode } from 'react';

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LikedTracksProvider>{children}</LikedTracksProvider>
    </AuthProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
