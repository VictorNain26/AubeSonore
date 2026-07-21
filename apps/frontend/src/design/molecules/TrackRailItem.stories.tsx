import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrackRailItem } from './TrackRailItem';

const meta: Meta<typeof TrackRailItem> = {
  title: 'Molecules/TrackRailItem',
  component: TrackRailItem,
};
export default meta;

const noop = () => {};

export const Etats: StoryObj = {
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
      <p className="py-2 text-caption text-text-muted">
        Survolez une ligne pour révéler like / partage.
      </p>
    </div>
  ),
};
