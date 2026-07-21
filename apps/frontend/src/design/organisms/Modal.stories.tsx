import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Modal } from './Modal';
import { TextField } from '../atoms/TextField';

const meta: Meta<typeof Modal> = {
  title: 'Organisms/Modal',
  component: Modal,
  parameters: {
    docs: {
      description: {
        component:
          'Fenêtre modale (Base UI Dialog), non contrôlée (`trigger`) ou contrôlée (`open`/`onOpenChange`). Composite : le contenu est du `children` libre, pas de story par état d’args.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof Modal>;

export const Connexion: Story = {
  parameters: {
    docs: { description: { story: 'Usage non contrôlé : le trigger interne gère l’ouverture.' } },
  },
  render: () => (
    <Modal title="Se connecter" trigger={<Button variant="ghost">Compte</Button>}>
      <div className="flex flex-col gap-4">
        <TextField label="Adresse e-mail" type="email" autoComplete="email" />
        <Button>Recevoir le lien</Button>
      </div>
    </Modal>
  ),
};

export const Controlee: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Usage contrôlé : l’état ouvert/fermé est piloté par un composant parent.',
      },
    },
  },
  render: () => {
    function ControlledModal() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <Button variant="ghost" onClick={() => setIsOpen(true)}>
            Panneau artiste
          </Button>
          <Modal title="Panneau artiste" open={isOpen} onOpenChange={setIsOpen}>
            <p className="text-body text-text-muted">
              Contenu du panneau, ouvert sans trigger interne.
            </p>
          </Modal>
        </>
      );
    }
    return <ControlledModal />;
  },
};
