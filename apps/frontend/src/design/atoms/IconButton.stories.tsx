import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart, Share2 } from 'lucide-react';
import { IconButton } from './IconButton';

const meta = {
  title: 'Atoms/IconButton',
  component: IconButton,
  parameters: {
    docs: {
      description: {
        component:
          'Bouton icône 44px basé sur `Button variant="icon"`, toujours visible. État `active` (couleur accent).',
      },
    },
  },
  argTypes: {
    label: { control: 'text', description: 'Libellé accessible, exposé en `aria-label`.' },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Partager',
    active: false,
    disabled: false,
    children: <Share2 className="size-5" />,
  },
} satisfies Meta<typeof IconButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: {
    label: 'Retirer de mes morceaux',
    active: true,
    children: <Heart className="size-5" fill="currentColor" />,
  },
};

export const Disabled: Story = {
  args: { label: 'Aimer', disabled: true, children: <Heart className="size-5" /> },
};

export const Showcase: Story = {
  parameters: {
    docs: { description: { story: 'Tous les états côte à côte.' } },
  },
  render: () => (
    <div className="flex items-center gap-2">
      <IconButton label="Partager">
        <Share2 className="size-5" />
      </IconButton>
      <IconButton label="Retirer de mes morceaux" active>
        <Heart className="size-5" fill="currentColor" />
      </IconButton>
      <IconButton label="Aimer" disabled>
        <Heart className="size-5" />
      </IconButton>
    </div>
  ),
};
