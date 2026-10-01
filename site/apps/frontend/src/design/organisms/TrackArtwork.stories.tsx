import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrackArtworkView } from './TrackArtwork';

const inkFlip = {
  initial: { opacity: 0, filter: 'blur(3px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(3px)' },
  transition: { duration: 0.35, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
};

const meta = {
  title: 'Organisms/TrackArtwork',
  component: TrackArtworkView,
  parameters: {
    docs: {
      description: {
        component:
          "Pochette du morceau en cours. Crossfade doux (`AnimatePresence`) sur changement de morceau, légère mise à l'échelle pendant la lecture, repli sur un `CoverGlyph` déterministe quand la pochette est absente, invalide ou la couverture par défaut d'AzuraCast.",
      },
    },
  },
  argTypes: {
    isDefaultCover: { control: 'boolean' },
    isPlaying: { control: 'boolean' },
  },
  args: {
    artUrl: 'https://picsum.photos/seed/aube/600/600',
    title: 'Nuits Sonores',
    seed: 'Aube Sonore|Nuits Sonores',
    isDefaultCover: false,
    isPlaying: true,
    onArtError: () => {},
    inkFlip,
  },
} satisfies Meta<typeof TrackArtworkView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playing: Story = {};

export const Paused: Story = { args: { isPlaying: false } };

export const DefaultCover: Story = { args: { isDefaultCover: true, artUrl: undefined } };
