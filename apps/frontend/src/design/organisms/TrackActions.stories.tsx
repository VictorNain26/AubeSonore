import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TrackActionsView } from './TrackActions';

const meta = {
  title: 'Organisms/TrackActions',
  component: TrackActionsView,
  parameters: {
    docs: {
      description: {
        component:
          "Barre d'actions du morceau courant : partager et aimer. Icônes 20px, cibles 44px. L'état aimé colore le cœur en accent ; pendant une requête, le bouton pulse et se désactive.",
      },
    },
  },
  argTypes: {
    isLiked: { control: 'boolean' },
    isLiking: { control: 'boolean' },
  },
  args: {
    isLiked: false,
    isLiking: false,
    onToggleLike: fn(),
    onShare: fn(),
  },
} satisfies Meta<typeof TrackActionsView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Liked: Story = { args: { isLiked: true } };

export const Liking: Story = { args: { isLiking: true } };

export const Showcase: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      <TrackActionsView {...args} isLiked={false} isLiking={false} />
      <TrackActionsView {...args} isLiked isLiking={false} />
      <TrackActionsView {...args} isLiked={false} isLiking />
    </div>
  ),
};
