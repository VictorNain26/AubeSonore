import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrackMetaView } from './TrackMeta';

const inkFlip = {
  initial: { opacity: 0, filter: 'blur(3px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(3px)' },
  transition: { duration: 0.25, ease: 'easeOut' as const },
};

const meta = {
  title: 'Features/TrackMeta',
  component: TrackMetaView,
  parameters: {
    docs: {
      description: {
        component:
          'Manchette du morceau en cours : titre en gros titre, artiste en dek, actions partager/aimer. Crossfade doux à chaque changement de morceau.',
      },
    },
  },
  argTypes: {
    isLiked: { control: 'boolean' },
    isLiking: { control: 'boolean' },
  },
  args: {
    inkFlip,
    shId: 1,
    title: 'Nuits Sonores',
    artist: 'Aube Ensemble',
    isLiked: false,
    isLiking: false,
    onToggleLike: () => {},
    onShare: () => {},
  },
} satisfies Meta<typeof TrackMetaView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const NotLiked: Story = {};

export const Liked: Story = { args: { isLiked: true } };

export const Liking: Story = { args: { isLiking: true } };

export const WithArtistLink: Story = { args: { onArtistInfo: () => {} } };

export const Loading: Story = {
  args: { title: undefined, artist: undefined, shId: undefined },
};
