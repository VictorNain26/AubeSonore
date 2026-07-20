import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Modal } from './Modal';
import { TextField } from './TextField';

const meta: Meta<typeof Modal> = { title: 'Primitives/Modal', component: Modal };
export default meta;

export const Connexion: StoryObj = {
  render: () => (
    <Modal title="Se connecter" trigger={<Button variant="ghost">Compte</Button>}>
      <div className="flex flex-col gap-4">
        <TextField label="Adresse e-mail" type="email" autoComplete="email" />
        <Button>Recevoir le lien</Button>
      </div>
    </Modal>
  ),
};
