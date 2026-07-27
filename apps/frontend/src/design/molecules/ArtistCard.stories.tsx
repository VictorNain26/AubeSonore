import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { ArtistCard } from './ArtistCard';

const meta = {
  title: 'Molecules/ArtistCard',
  component: ArtistCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Carte d’artiste similaire menant à sa page. Le carré de l’image est réservé via `aspect-square` pour que la grille ne se décale pas pendant le chargement.',
      },
    },
  },
  argTypes: {
    image: { control: 'text' },
    name: { control: 'text' },
    slug: { control: 'text', description: 'Segment décoratif, ignoré à la résolution.' },
  },
  args: {
    id: 'abc',
    name: 'Justice',
    slug: 'justice',
    image: null,
  },
} satisfies Meta<typeof ArtistCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const SansPortrait: Story = {};

export const AvecPortrait: Story = {
  args: { image: 'https://picsum.photos/seed/justice/200/200' },
};

export const NomLong: Story = {
  args: { name: 'Godspeed You! Black Emperor', slug: 'godspeed-you-black-emperor' },
  parameters: {
    docs: {
      description: { story: 'Le nom est tronqué sur une ligne plutôt que d’élargir la carte.' },
    },
  },
};

export const Showcase: Story = {
  parameters: {
    docs: {
      description: { story: 'Une rangée telle qu’elle apparaît dans « Artistes similaires ».' },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <ArtistCard id="1" name="Justice" slug="justice" image={null} />
      <ArtistCard id="2" name="Air" slug="air" image="https://picsum.photos/seed/air/200/200" />
      <ArtistCard id="3" name="Cassius" slug="cassius" image={null} />
      <ArtistCard id="4" name="Godspeed You! Black Emperor" slug="gybe" image={null} />
    </div>
  ),
};
