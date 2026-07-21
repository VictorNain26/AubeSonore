import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArtistContextView } from './ArtistContext';

const meta = {
  title: 'Organisms/ArtistContext',
  component: ArtistContextView,
  parameters: {
    docs: {
      description: {
        component:
          'Modale de contexte artiste : biographie, tags et artistes similaires depuis Last.fm.',
      },
    },
  },
  argTypes: {
    isOpen: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
  args: {
    artistName: 'Aube Ensemble',
    isOpen: true,
    onClose: () => {},
    isLoading: false,
    data: {
      bio: 'Un collectif électro-acoustique explorant les lisières entre field recording et synthèse modulaire, actif depuis 2019.',
      tags: ['ambient', 'field recording', 'modular'],
      similarArtists: ['Nocturne Île', 'Sillage', 'Marée Basse'],
      listeners: 4200,
    },
  },
} satisfies Meta<typeof ArtistContextView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Loading: Story = { args: { isLoading: true, data: null } };

export const Empty: Story = {
  args: { data: { bio: '', tags: [], similarArtists: [], listeners: 0 } },
};
