import type { Meta, StoryObj } from '@storybook/react-vite';
import { LayoutView } from './LayoutView';

const meta = {
  title: 'Features/Layout/Shell',
  component: LayoutView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          "Charpente de l'application : bandeau, lien d'évitement, landmark `<main>` et notifications toast. Le conteneur `Layout` lit les stores auth/modale et gère le flux de réinitialisation de mot de passe.",
      },
    },
  },
  argTypes: {
    isAuthenticated: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
  args: {
    children: <p className="p-6 text-body text-text">Contenu de la page.</p>,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    onSignOut: () => {},
    onOpenAuthModal: () => {},
    onOpenAbout: () => {},
    aboutModal: null,
  },
} satisfies Meta<typeof LayoutView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Deconnecte: Story = {};

export const Connecte: Story = {
  args: {
    user: { name: 'Camille Dupont', email: 'camille@aubesonore.fr' },
    isAuthenticated: true,
  },
};

export const ChargementSession: Story = {
  args: { isLoading: true },
};
