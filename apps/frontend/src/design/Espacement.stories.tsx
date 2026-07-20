import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = { title: 'Fondations/Espacement' };
export default meta;

const STEPS = [1, 2, 3, 4, 6, 8, 12, 16];

export const Echelle: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      {STEPS.map((step) => (
        <div key={step} className="flex items-center gap-4">
          <span className="w-16 text-caption text-text-muted tabular-nums">{step * 4}px</span>
          <div className="bg-accent" style={{ width: `${step * 0.25}rem`, height: '1rem' }} />
        </div>
      ))}
      <p className="mt-4 max-w-[66ch] text-caption text-text-muted">
        Base 4px (échelle Tailwind par défaut) — les espacements de composition privilégient les
        multiples de 8 : gap-2, gap-4, gap-6, gap-8.
      </p>
    </div>
  ),
};
