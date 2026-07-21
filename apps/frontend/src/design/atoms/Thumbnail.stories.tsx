import type { Meta, StoryObj } from '@storybook/react-vite';
import { Thumbnail } from './Thumbnail';

const meta = {
  title: 'Atoms/Thumbnail',
  component: Thumbnail,
  parameters: {
    docs: {
      description: {
        component:
          'Vignette carrée de pochette. Bascule automatiquement sur une icône musicale de secours si `src` est absent ou en erreur de chargement.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
      description: 'Taille du carré : `sm` (40px) ou `md` (48px).',
    },
    src: { control: 'text' },
    alt: { control: 'text' },
  },
  args: {
    size: 'md',
    src: 'https://picsum.photos/seed/aube/96',
    alt: 'Pochette exemple',
  },
} satisfies Meta<typeof Thumbnail>;
export default meta;

type Story = StoryObj<typeof meta>;

export const AvecImage: Story = {};

export const Fallback: Story = {
  parameters: {
    docs: { description: { story: 'Sans `src`, l’icône musicale de secours s’affiche.' } },
  },
  render: (args) => <Thumbnail size={args.size ?? 'md'} />,
};

export const PetiteTaille: Story = {
  args: { size: 'sm' },
};

export const Showcase: Story = {
  parameters: {
    docs: { description: { story: 'Image, fallback et les deux tailles côte à côte.' } },
  },
  render: () => (
    <div className="flex items-end gap-6">
      <Thumbnail size="md" src="https://picsum.photos/seed/aube/96" alt="Pochette exemple" />
      <Thumbnail size="md" alt="" />
      <Thumbnail size="sm" alt="" />
      <p className="text-caption text-text-muted">Image · fallback (md) · fallback (sm)</p>
    </div>
  ),
};
