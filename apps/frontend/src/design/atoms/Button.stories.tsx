import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          'Bouton d’action principal. Variants `primary` / `ghost` / `icon`, état `loading` intégré, cible ≥ 44px, `focus-visible` et `disabled` gérés. Basculez le thème (barre d’outils **Thème**) pour vérifier chaque état en clair et sombre.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'ghost', 'icon'],
      description: 'Style visuel. `icon` = bouton carré 44px, icône seule.',
    },
    loading: { control: 'boolean', description: 'Affiche un spinner et désactive le bouton.' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: {
    variant: 'primary',
    children: 'Écouter le direct',
    loading: false,
    disabled: false,
  },
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Ghost: Story = { args: { variant: 'ghost', children: 'Historique' } };

export const Icon: Story = {
  args: { variant: 'icon', children: '↗', 'aria-label': 'Partager' },
  parameters: {
    docs: { description: { story: 'Icône seule : le nom accessible vient de `aria-label`.' } },
  },
};

export const Loading: Story = { args: { loading: true, children: 'Connexion' } };

export const Disabled: Story = { args: { disabled: true } };

export const Showcase: Story = {
  parameters: {
    docs: { description: { story: 'Tous les variants et états côte à côte.' } },
  },
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-4">
        <Button>Écouter le direct</Button>
        <Button variant="ghost">Historique</Button>
        <Button variant="icon" aria-label="Partager">
          ↗
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <Button disabled>Écouter le direct</Button>
        <Button variant="ghost" disabled>
          Historique
        </Button>
        <Button loading>Connexion</Button>
      </div>
    </div>
  ),
};
