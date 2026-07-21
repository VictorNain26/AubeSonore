import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = { title: 'Fondations/Couleurs' };
export default meta;

const SWATCHES = [
  { name: 'surface', className: 'bg-surface border border-border' },
  { name: 'surface-raised', className: 'bg-surface-raised' },
  { name: 'text', className: 'bg-text' },
  { name: 'text-muted', className: 'bg-text-muted' },
  { name: 'text-faint', className: 'bg-text-faint' },
  { name: 'border', className: 'bg-border' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'on-accent', className: 'bg-on-accent border border-border' },
];

export const Palette: StoryObj = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SWATCHES.map((s) => (
          <figure key={s.name} className="flex flex-col gap-2">
            <div className={`h-16 rounded-md ${s.className}`} />
            <figcaption className="text-caption text-text-muted">{s.name}</figcaption>
          </figure>
        ))}
      </div>
      <div className="rounded-md bg-accent p-4 text-body text-on-accent">
        Texte sur accent — la paire on-accent/accent est prouvée AA.
      </div>
    </div>
  ),
};

export const LueurAube: StoryObj = {
  render: () => (
    <div className="dawn-glow -m-8 min-h-screen p-8">
      <p className="max-w-[66ch] text-display">La page semble imprimée au lever du jour.</p>
      <p className="mt-4 max-w-[66ch] text-body text-text-muted">
        La lueur est un dégradé statique en tête de page, présent dans les deux thèmes. Elle doit
        rester discrète : si elle se remarque avant le contenu, elle est trop forte.
      </p>
    </div>
  ),
};
