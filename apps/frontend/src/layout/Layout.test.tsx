// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Layout from './Layout';
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

describe('Layout', () => {
  it('renders the wordmark, skip link and main landmark', () => {
    render(
      <Layout>
        <p>contenu</p>
      </Layout>
    );

    expect(screen.getByText('AubeSonore')).toBeInTheDocument();
    const skipLink = screen.getByRole('link', { name: 'Aller au contenu principal' });
    expect(skipLink).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByText('contenu')).toBeInTheDocument();
  });

  it('shows the sign-in button when unauthenticated and opens the auth modal on click', async () => {
    render(
      <Layout>
        <p>contenu</p>
      </Layout>
    );

    const button = screen.getByRole('button', { name: 'Connexion' });
    await userEvent.click(button);

    expect(useAuthModalStore.getState().isOpen).toBe(true);
  });

  it('shows the user menu when authenticated, revealing name, email and sign-out', async () => {
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

    render(
      <Layout>
        <p>contenu</p>
      </Layout>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Réglages et compte' }));

    expect(await screen.findByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Déconnexion'));
    expect(signOut).toHaveBeenCalled();
  });

  it('shows neither sign-in nor user menu while loading', () => {
    useAuthStore.setState({ ...baseAuthState, isLoading: true });

    render(
      <Layout>
        <p>contenu</p>
      </Layout>
    );

    expect(screen.queryByRole('button', { name: 'Connexion' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réglages et compte' })).not.toBeInTheDocument();
  });

  it('opens the reset-password modal from the URL and cleans it up', () => {
    window.history.replaceState({}, '', '/reset-password?token=abc123');

    render(
      <Layout>
        <p>contenu</p>
      </Layout>
    );

    expect(useAuthModalStore.getState().resetToken).toBe('abc123');
    expect(useAuthModalStore.getState().isOpen).toBe(true);
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('');
  });
});
