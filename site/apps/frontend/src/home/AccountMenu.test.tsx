// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountMenu } from './AccountMenu';

describe('AccountMenu', () => {
  it('shows the initial, then the account and signs out', async () => {
    const onSignOut = vi.fn();
    render(
      <AccountMenu user={{ name: 'Jane', email: 'jane@example.com' }} onSignOut={onSignOut} />
    );

    const trigger = screen.getByRole('button', { name: 'Réglages et compte' });
    expect(trigger).toHaveTextContent('J');
    await userEvent.click(trigger);

    expect(await screen.findByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Déconnexion/ }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
