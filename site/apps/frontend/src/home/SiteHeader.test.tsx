// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteHeader } from './SiteHeader';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';

const mockMatchMedia = () => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
};

const baseAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authError: null,
};

beforeEach(() => {
  mockMatchMedia();
  window.history.replaceState({}, '', '/');
  useAuthStore.setState(baseAuthState);
  useAuthModalStore.setState({ isOpen: false, mode: 'signin', resetToken: null });
});

describe('SiteHeader', () => {
  it('shows the sign-in button when unauthenticated and opens the auth modal on click', async () => {
    render(<SiteHeader />);

    const button = screen.getByRole('button', { name: 'Se connecter' });
    await userEvent.click(button);

    expect(useAuthModalStore.getState().isOpen).toBe(true);
  });

  it('opens the library of a signed-in listener, where they can sign out', async () => {
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'jane@example.com',
        name: 'Jane',
        image: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      isLoading: false,
      authError: null,
    });
    const signOut = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ signOut });

    render(<SiteHeader />);

    await userEvent.click(screen.getByRole('button', { name: 'Mes morceaux' }));
    expect(await screen.findByRole('dialog', { name: 'Ma bibliothèque' })).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(signOut).toHaveBeenCalled();
  });

  it('shows neither sign-in nor user menu while loading', () => {
    useAuthStore.setState({ ...baseAuthState, isLoading: true });

    render(<SiteHeader />);

    expect(screen.queryByRole('button', { name: 'Se connecter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mes morceaux' })).not.toBeInTheDocument();
  });

  it('opens my tracks only for a signed-in listener', () => {
    render(<SiteHeader />);
    expect(screen.queryByRole('button', { name: 'Mes morceaux' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Les plus gardés' })).toHaveAttribute(
      'href',
      '#plus-gardes'
    );
  });
});
