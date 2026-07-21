import type { Meta, StoryObj } from '@storybook/react-vite';
import { AirPlayButtonView } from './AirPlayButton';

const meta = {
  title: 'Features/AirPlayButton',
  component: AirPlayButtonView,
  parameters: {
    docs: {
      description: {
        component:
          'Ouvre le sélecteur de périphérique AirPlay. Un point accent sous l’icône signale une diffusion active.',
      },
    },
  },
  args: {
    isActive: false,
    onOpenPicker: () => undefined,
  },
} satisfies Meta<typeof AirPlayButtonView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Inactive: Story = {};

export const Active: Story = { args: { isActive: true } };
