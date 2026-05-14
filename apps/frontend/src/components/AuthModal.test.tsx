// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { AuthModal } from './AuthModal';

describe('AuthModal', () => {
  it('renders dialog when open', () => {
    renderWithProviders(<AuthModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render dialog when closed', () => {
    renderWithProviders(<AuthModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('switches to signup mode when clicking the switch button', async () => {
    renderWithProviders(<AuthModal isOpen={true} onClose={vi.fn()} defaultMode="signin" />);

    // In signin mode the switch button reads "Pas encore de compte ? S'inscrire"
    const switchBtn = screen.getByRole('button', { name: /pas encore de compte/i });
    await userEvent.click(switchBtn);

    // In signup mode the title changes and a "Nom" input appears
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nom')).toBeInTheDocument();
    });
  });

  it('submits signin form and closes on success', async () => {
    const onClose = vi.fn();
    renderWithProviders(<AuthModal isOpen={true} onClose={onClose} defaultMode="signin" />);

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Mot de passe');

    await userEvent.type(emailInput, 'a@b.c');
    await userEvent.type(passwordInput, 'password123');

    const submitBtn = screen.getByRole('button', { name: 'Se connecter' });
    await userEvent.click(submitBtn);

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 3000 });
  });
});
