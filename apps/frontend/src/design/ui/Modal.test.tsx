// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Modal } from './Modal';

describe('Modal', () => {
  it('opens from the trigger and shows the title', () => {
    render(
      <Modal title="Se connecter" trigger={<Button variant="ghost">Compte</Button>}>
        <p>Contenu</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Compte' }));
    expect(screen.getByRole('dialog', { name: 'Se connecter' })).toBeInTheDocument();
  });
  it('closes via the close button', () => {
    render(
      <Modal title="Se connecter" trigger={<Button variant="ghost">Compte</Button>}>
        <p>Contenu</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Compte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
