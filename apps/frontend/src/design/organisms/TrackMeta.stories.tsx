import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrackMetaView } from './TrackMeta';

const inkFlip = {
  initial: { opacity: 0, filter: 'blur(3px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(3px)' },
  transition: { duration: 0.25, ease: 'easeOut' as const },
};

const meta = {
  title: 'Organisms/TrackMeta',
  component: TrackMetaView,
  parameters: {
    docs: {
      description: {
        component:
          'Manchette du morceau en cours : titre en gros titre (borné à 2 lignes, titre complet en infobulle), artiste en dek. Crossfade doux à chaque changement de morceau. Les actions partager/aimer vivent désormais dans TrackActions.',
      },
    },
  },
  args: {
    inkFlip,
    shId: 1,
    title: 'Nuits Sonores',
    artist: 'Aube Ensemble',
  },
} satisfies Meta<typeof TrackMetaView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithArtistLink: Story = { args: { onArtistInfo: () => {} } };

export const LongTitle: Story = {
  args: {
    title:
      'A Very Long Track Title That Would Otherwise Wrap Across Many Lines And Break The Layout',
  },
};

export const Loading: Story = {
  args: { title: undefined, artist: undefined, shId: undefined },
};
