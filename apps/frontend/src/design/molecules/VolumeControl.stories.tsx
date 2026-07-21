import type { Meta, StoryObj } from '@storybook/react-vite';
import { VolumeControlView } from './VolumeControl';

const meta = {
  title: 'Molecules/VolumeControl',
  component: VolumeControlView,
  parameters: {
    docs: {
      description: {
        component:
          'Contrôle de volume : icône seule au repos, popover slider vertical au survol (desktop) ou au tap (tactile).',
      },
    },
  },
  argTypes: {
    volume: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    isMuted: { control: 'boolean' },
    isExpanded: { control: 'boolean' },
  },
  args: {
    volume: 0.6,
    isMuted: false,
    isExpanded: false,
    containerRef: { current: null },
    onVolumeChange: () => {},
    onMouseEnter: () => {},
    onMouseLeave: () => {},
    onIconClick: () => {},
  },
} satisfies Meta<typeof VolumeControlView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Expanded: Story = { args: { isExpanded: true } };

export const Muted: Story = { args: { isMuted: true } };
