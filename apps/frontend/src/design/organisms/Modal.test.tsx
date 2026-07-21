// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '../atoms/Button';
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

  it('opens without a trigger when controlled via the open prop', () => {
    render(
      <Modal title="Panneau artiste" open>
        <p>Contenu</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Panneau artiste' })).toBeInTheDocument();
  });

  it('calls onOpenChange with false when closed via the close button', () => {
    const onOpenChange = vi.fn();
    render(
      <Modal title="Panneau artiste" open onOpenChange={onOpenChange}>
        <p>Contenu</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
