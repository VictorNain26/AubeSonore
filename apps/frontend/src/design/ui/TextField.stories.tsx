import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField';

const meta: Meta<typeof TextField> = { title: 'Primitives/TextField', component: TextField };
export default meta;

export const Etats: StoryObj = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <TextField
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        placeholder="toi@exemple.fr"
      />
      <TextField
        label="Adresse e-mail"
        type="email"
        defaultValue="pas-une-adresse"
        error="Adresse invalide — vérifie le format."
      />
      <TextField label="Pseudo" disabled defaultValue="aube.sonore" />
    </div>
  ),
};
