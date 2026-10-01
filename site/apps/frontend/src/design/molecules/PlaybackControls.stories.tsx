import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlaybackControlsView } from './PlaybackControls';

const meta = {
  title: 'Molecules/PlaybackControls',
  component: PlaybackControlsView,
  parameters: {
    docs: {
      description: {
        component:
          'Bouton central lecture/arrêt du direct. Un seul geste, un seul état visible à la fois, transition douce entre les deux icônes.',
      },
    },
  },
  argTypes: {
    isPlaying: { control: 'boolean' },
  },
  args: {
    isPlaying: false,
    onTogglePlay: () => {},
  },
} satisfies Meta<typeof PlaybackControlsView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Paused: Story = {};

export const Playing: Story = { args: { isPlaying: true } };
