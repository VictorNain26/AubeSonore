import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { TextField } from './TextField';

const meta = {
  title: 'Atoms/TextField',
  component: TextField,
  parameters: {
    docs: {
      description: {
        component:
          'Champ de texte avec libellé, état d’erreur et zone `trailing` optionnelle (icône, bouton…), construit sur `Field` de Base UI.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text', description: 'Message d’erreur ; sa présence bascule en invalide.' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Adresse e-mail',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'toi@exemple.fr',
  },
} satisfies Meta<typeof TextField>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AvecErreur: Story = {
  args: {
    defaultValue: 'pas-une-adresse',
    error: 'Adresse invalide — vérifie le format.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Pseudo',
    type: 'text',
    autoComplete: undefined,
    disabled: true,
    defaultValue: 'aube.sonore',
  },
};

export const AvecTrailing: Story = {
  args: {
    label: 'Mot de passe',
    type: 'password',
    autoComplete: 'current-password',
    placeholder: undefined,
    trailing: (
      <Button type="button" variant="icon" aria-label="Afficher le mot de passe">
        👁
      </Button>
    ),
  },
};

export const Showcase: Story = {
  parameters: {
    docs: { description: { story: 'Tous les états côte à côte.' } },
  },
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
      <TextField
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        trailing={
          <Button type="button" variant="icon" aria-label="Afficher le mot de passe">
            👁
          </Button>
        }
      />
    </div>
  ),
};
