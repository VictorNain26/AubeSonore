import type { Meta, StoryObj } from '@storybook/react-vite';
import { LikedTrackRowView } from './LikedTrackRow';

const meta = {
  title: 'Features/LikedTracks/Row',
  component: LikedTrackRowView,
  parameters: {
    docs: {
      description: {
        component:
          'Une ligne de la modale « Ma bibliothèque » : pochette, titre/artiste, lien vers la plateforme préférée et suppression. Basculez le thème (barre d’outils **Thème**) pour vérifier chaque état en clair et sombre.',
      },
    },
  },
  argTypes: {
    linkIsSearch: {
      control: 'boolean',
      description: 'Le lien est une recherche plutôt qu’un lien direct vers le morceau.',
    },
    isDeleting: { control: 'boolean' },
  },
  args: {
    title: 'Nuits Sonores',
    artist: 'Aube Sonore',
    artworkUrl: 'https://picsum.photos/seed/aube-liked/96',
    linkHref: 'https://open.spotify.com/track/x',
    linkIsSearch: false,
    platformName: 'Spotify',
    isDeleting: false,
    onDelete: () => {},
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

export const Recherche: Story = {
  args: { linkIsSearch: true },
  parameters: {
    docs: {
      description: {
        story: 'Aucun lien direct trouvé : le bouton ouvre une recherche sur la plateforme.',
      },
    },
  },
};

export const Suppression: Story = {
  args: { isDeleting: true },
  parameters: {
    docs: { description: { story: 'Suppression en cours : la ligne s’atténue.' } },
  },
};
