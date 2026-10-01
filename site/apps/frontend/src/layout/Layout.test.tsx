// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from './Layout';
import { useAuthModalStore } from '../stores/authModalStore';

const mockMatchMedia = () => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
};

beforeEach(() => {
  mockMatchMedia();
  window.history.replaceState({}, '', '/');
  useAuthModalStore.setState({ isOpen: false, mode: 'signin', resetToken: null });
});

describe('Layout', () => {
  it('renders the skip link to the main landmark and the page', () => {
    render(
      <Layout>
        <main id="main">contenu</main>
      </Layout>
    );

    const skipLink = screen.getByRole('link', { name: 'Aller au contenu principal' });
    expect(skipLink).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveTextContent('contenu');
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
