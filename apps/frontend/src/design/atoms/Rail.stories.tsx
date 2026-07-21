import type { Meta, StoryObj } from '@storybook/react-vite';
import { Rail } from './Rail';

const meta: Meta<typeof Rail> = { title: 'Atoms/Rail', component: Rail };
export default meta;

const Card = ({ n }: { n: number }) => (
  <div
    role="listitem"
    className="flex h-20 w-64 shrink-0 items-center justify-center rounded-md bg-surface-raised text-body text-text-muted"
  >
    Carte {n}
  </div>
);

export const PeuDItems: StoryObj = {
  render: () => (
    <Rail ariaLabel="Démonstration">
      {[1, 2].map((n) => (
        <Card key={n} n={n} />
      ))}
    </Rail>
  ),
};

export const Draggable: StoryObj = {
  render: () => (
    <Rail ariaLabel="Démonstration">
      {Array.from({ length: 12 }, (_, i) => (
        <Card key={i} n={i + 1} />
      ))}
    </Rail>
  ),
};
