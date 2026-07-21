import type { Meta, StoryObj } from '@storybook/react-vite';
import { SecondaryControlsView } from './SecondaryControls';

const meta = {
  title: 'Features/SecondaryControls',
  component: SecondaryControlsView,
  parameters: {
    docs: {
      description: {
        component:
          'Volume et routage de sortie audio : les satellites du geste de lecture. Le bouton AirPlay ne s’affiche que si la fonctionnalité est disponible sur le navigateur.',
      },
    },
  },
  args: {
    volume: 0.6,
    isMuted: false,
    onVolumeChange: () => undefined,
    onToggleMute: () => undefined,
  },
} satisfies Meta<typeof SecondaryControlsView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Muted: Story = { args: { isMuted: true } };
