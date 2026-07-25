import type { Meta, StoryObj } from '@storybook/react-vite';
import { LikedTrackRowView } from './LikedTrackRow';

const meta = {
  title: 'Molecules/LikedTrackRow',
  component: LikedTrackRowView,
  parameters: {
    docs: {
      description: {
        component:
          'Une ligne de la modale « Ma bibliothèque » : pochette, titre/artiste, actions ouvrir/partager, et suppression avec annulation inline et barre de compte à rebours. Basculez le thème (barre d’outils **Thème**) pour vérifier chaque état en clair et sombre.',
      },
    },
  },
  argTypes: {
    pendingRemoval: { control: 'boolean' },
  },
  args: {
    title: 'Nuits Sonores',
    artist: 'Aube Sonore',
    artworkUrl: 'https://picsum.photos/seed/aube-liked/96',
    linkHref: 'https://open.spotify.com/track/x',
    platformName: 'Spotify',
    pendingRemoval: false,
    onShare: () => {},
    onDelete: () => {},
    onUndo: () => {},
  },
} satisfies Meta<typeof LikedTrackRowView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const AvecPochette: Story = {};

export const SansPochette: Story = {
  render: (args) => {
    const { artworkUrl: _artworkUrl, ...rest } = args;
    return <LikedTrackRowView {...rest} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Sans pochette : `Thumbnail` retombe sur son icône de remplacement.',
      },
    },
  },
};

export const LienNonResolu: Story = {
  args: { linkHref: null },
  parameters: {
    docs: {
      description: {
        story:
          'Liens pas encore résolus : ouvrir est désactivé (jamais de recherche déguisée) ; partager reste actif car il pointe vers la page de partage de la radio.',
      },
    },
  },
};

export const Suppression: Story = {
  args: { pendingRemoval: true, removalFraction: 0.6 },
  parameters: {
    docs: {
      description: {
        story:
          'Retrait en attente : la ligne reste visible, grisée, avec un bouton « Annuler » et une barre de compte à rebours avant suppression effective.',
      },
    },
  },
};
