import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrackRailItem } from './TrackRailItem';

const meta: Meta<typeof TrackRailItem> = {
  title: 'Molecules/TrackRailItem',
  component: TrackRailItem,
  parameters: {
    docs: {
      description: {
        component:
          'Ligne d’un morceau récent : miniature, titre/artiste, actions favori/partage toujours visibles. Composite : les états sont montrés côte à côte plutôt qu’en une story par variante.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    artist: { control: 'text' },
    isLiked: { control: 'boolean' },
    isLiking: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof TrackRailItem>;

const noop = () => {};

export const Etats: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Trois états : neutre, aimé, requête like en cours + titre/artiste longs.',
      },
    },
  },
  render: () => (
    <div role="list" className="flex flex-col divide-y divide-border">
      <TrackRailItem
        title="Titre du morceau"
        artist="Artiste"
        art="https://picsum.photos/seed/aube1/96"
        isLiked={false}
        isLiking={false}
        onToggle={noop}
        onShare={noop}
      />
      <TrackRailItem
        title="Morceau aimé"
        artist="Autre artiste"
        isLiked
        isLiking={false}
        onToggle={noop}
        onShare={noop}
      />
      <TrackRailItem
        title="Un titre particulièrement long qui doit être tronqué proprement"
        artist="Artiste au nom également très long"
        isLiked={false}
        isLiking
        onToggle={noop}
        onShare={noop}
      />
    </div>
  ),
};
