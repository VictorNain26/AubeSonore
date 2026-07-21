import type { Meta, StoryObj } from '@storybook/react-vite';
import { AntennaView } from './Antenna';

const meta = {
  title: 'Molecules/Antenna',
  component: AntennaView,
  parameters: {
    docs: {
      description: {
        component:
          'Le tracé de l’antenne : une onde audio-réactive qui signale que le direct joue. Pas une timeline — un direct n’a pas de position navigable, donc pas de scrubbing.',
      },
    },
  },
  args: {
    isOnline: true,
    isPlaying: true,
    songId: 42,
  },
} satisfies Meta<typeof AntennaView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const OnAir: Story = {};

export const Paused: Story = { args: { isPlaying: false } };

export const OffAir: Story = { args: { isOnline: false } };
