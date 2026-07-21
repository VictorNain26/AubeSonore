import type { Meta, StoryObj } from '@storybook/react-vite';
import { Rail } from './Rail';

const meta: Meta<typeof Rail> = {
  title: 'Atoms/Rail',
  component: Rail,
  parameters: {
    docs: {
      description: {
        component:
          'Piste horizontale défilable (Embla) sans flèches ni scrollbar visible, glissable à la souris comme au doigt. Composite : les entrées sont passées en `children` (`role="listitem"`), pas de story par état d’args.',
      },
    },
  },
  argTypes: {
    ariaLabel: { control: 'text', description: 'Nom accessible de la liste défilante.' },
  },
};
export default meta;

type Story = StoryObj<typeof Rail>;

const Card = ({ n }: { n: number }) => (
  <div
    role="listitem"
    className="flex h-20 w-64 shrink-0 items-center justify-center rounded-md bg-surface-raised text-body text-text-muted"
  >
    Carte {n}
  </div>
);

export const PeuDItems: Story = {
  render: () => (
    <Rail ariaLabel="Démonstration">
      {[1, 2].map((n) => (
        <Card key={n} n={n} />
      ))}
    </Rail>
  ),
  parameters: {
    docs: { description: { story: 'Peu de cartes : pas besoin de défiler.' } },
  },
};

export const Draggable: Story = {
  render: () => (
    <Rail ariaLabel="Démonstration">
      {Array.from({ length: 12 }, (_, i) => (
        <Card key={i} n={i + 1} />
      ))}
    </Rail>
  ),
  parameters: {
    docs: {
      description: { story: 'Assez de cartes pour déborder : la piste devient glissable.' },
    },
  },
};
