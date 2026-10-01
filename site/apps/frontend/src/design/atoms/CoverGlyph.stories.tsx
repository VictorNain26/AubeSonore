import type { Meta, StoryObj } from '@storybook/react-vite';
import { CoverGlyph } from './CoverGlyph';

const meta = {
  title: 'Atoms/CoverGlyph',
  component: CoverGlyph,
  parameters: {
    docs: {
      description: {
        component:
          'Visuel de repli déterministe pour une pochette absente : teinte et onde statique dérivées d’un hash du `seed`, sans animation.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
      description: 'Taille du carré : `sm` (40px) ou `md` (48px).',
    },
    seed: { control: 'text' },
  },
  args: {
    seed: 'Aubory Bugg|nosedive',
    size: 'md',
  },
} satisfies Meta<typeof CoverGlyph>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PetiteTaille: Story = {
  args: { size: 'sm' },
};

export const Showcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Plusieurs seeds côte à côte, dans les deux tailles : la teinte et l’onde varient de façon déterministe selon le hash.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-4">
        <CoverGlyph seed="Aubory Bugg|nosedive" size="md" />
        <CoverGlyph seed="gemstonemario|Dilema" size="md" />
        <CoverGlyph seed="GHO$$|666" size="md" />
      </div>
      <div className="flex items-end gap-4">
        <CoverGlyph seed="Aubory Bugg|nosedive" size="sm" />
        <CoverGlyph seed="gemstonemario|Dilema" size="sm" />
        <CoverGlyph seed="GHO$$|666" size="sm" />
      </div>
      <p className="text-caption text-text-muted">
        md (48px) puis sm (40px) — mêmes seeds, même teinte à chaque rendu.
      </p>
    </div>
  ),
};
