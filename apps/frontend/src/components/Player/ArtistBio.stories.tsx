import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArtistBioView } from './ArtistBio';

const meta = {
  title: 'Features/ArtistBio',
  component: ArtistBioView,
  parameters: {
    docs: {
      description: {
        component:
          'Teaser de biographie inline, tronqué à 3 lignes, avec lien vers la modale de contexte artiste complète.',
      },
    },
  },
} satisfies Meta<typeof ArtistBioView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Bio: Story = {
  args: {
    variant: 'bio',
    bio: 'Un collectif électro-acoustique explorant les lisières entre field recording et synthèse modulaire, actif depuis 2019.',
    artistName: 'Aube Ensemble',
    onOpenPanel: () => {},
  },
};

export const Loading: Story = {
  args: { variant: 'loading' },
};
