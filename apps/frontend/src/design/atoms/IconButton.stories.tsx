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
          'Bouton icône 44px basé sur `Button variant="icon"`. États `active` (couleur accent) et `reveal` (masqué jusqu’au survol/focus d’un parent `.group`).',
      },
    },
  },
  argTypes: {
    label: { control: 'text', description: 'Libellé accessible, exposé en `aria-label`.' },
    active: { control: 'boolean' },
    reveal: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Partager',
    active: false,
    reveal: false,
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

export const Reveal: Story = {
  args: { label: 'Aimer', reveal: true, children: <Heart className="size-5" /> },
  parameters: {
    docs: {
      description: {
        story: 'Nécessite un parent `.group` : survolez la zone pour révéler le bouton.',
      },
    },
  },
  render: (args) => (
    <div className="group flex items-center gap-2 rounded-md border border-border p-3">
      <span className="text-caption text-text-muted">Survolez ce bloc :</span>
      <IconButton {...args} />
    </div>
  ),
};

export const Showcase: Story = {
  parameters: {
    docs: { description: { story: 'Tous les états côte à côte.' } },
  },
  render: () => (
    <div className="flex flex-col items-start gap-6">
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
      <div className="group flex items-center gap-2 rounded-md border border-border p-3">
        <span className="text-caption text-text-muted">Survolez ce bloc — actions `reveal` :</span>
        <IconButton label="Aimer" reveal>
          <Heart className="size-5" />
        </IconButton>
        <IconButton label="Partager" reveal>
          <Share2 className="size-5" />
        </IconButton>
      </div>
    </div>
  ),
};
