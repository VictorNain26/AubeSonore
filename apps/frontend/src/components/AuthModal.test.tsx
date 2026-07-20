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

    // In signup mode the title changes and a "Nom" field appears
    await waitFor(() => {
      expect(screen.getByLabelText('Nom')).toBeInTheDocument();
    });
  });

  it('submits signin form and closes on success', async () => {
    const onClose = vi.fn();
    renderWithProviders(<AuthModal isOpen={true} onClose={onClose} defaultMode="signin" />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Mot de passe');

    await userEvent.type(emailInput, 'a@b.c');
    await userEvent.type(passwordInput, 'password123');

    const submitBtn = screen.getByRole('button', { name: 'Se connecter' });
    await userEvent.click(submitBtn);

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('associates a visible label with the email field', () => {
    renderWithProviders(<AuthModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('flags mismatched passwords on the confirmation field, not via toast', async () => {
    renderWithProviders(<AuthModal isOpen={true} onClose={vi.fn()} resetToken="some-token" />);

    const passwordInput = screen
      .getAllByLabelText('Nouveau mot de passe')
      .find((el) => el.tagName === 'INPUT') as HTMLInputElement;
    const confirmInput = screen.getByLabelText('Confirmer le mot de passe');

    await userEvent.type(passwordInput, 'password123');
    await userEvent.type(confirmInput, 'different123');
    await userEvent.tab();

    expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
    expect(confirmInput).toHaveAttribute('aria-invalid', 'true');
  });
});
