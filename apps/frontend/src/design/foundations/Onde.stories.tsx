import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = { title: 'Fondations/Onde' };
export default meta;

const wavePath = (amplitude: number, cycles: number) => {
  const points = Array.from({ length: 121 }, (_, i) => {
    const x = (i / 120) * 600;
    const y =
      40 + amplitude * Math.sin((i / 120) * cycles * Math.PI * 2) * Math.sin((i / 120) * Math.PI);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return points.join(' ');
};

const Wave = ({
  amplitude,
  cycles,
  thickness,
  label,
}: {
  amplitude: number;
  cycles: number;
  thickness: number;
  label: string;
}) => (
  <figure className="flex flex-col gap-1">
    <svg viewBox="0 0 600 80" className="h-20 w-full max-w-2xl" role="img" aria-label={label}>
      <path
        d={wavePath(amplitude, cycles)}
        fill="none"
        stroke="currentColor"
        strokeWidth={thickness}
        strokeLinecap="round"
      />
    </svg>
    <figcaption className="text-caption text-text-muted">{label}</figcaption>
  </figure>
);

export const Etude: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-8 text-text">
      <Wave amplitude={26} cycles={9} thickness={1.5} label="Direct — fine (1.5)" />
      <Wave amplitude={26} cycles={9} thickness={2.5} label="Direct — médium (2.5)" />
      <Wave amplitude={12} cycles={14} thickness={1.5} label="Direct — dense et calme" />
      <Wave amplitude={0} cycles={1} thickness={1.5} label="Pause — le filet" />
      <div className="text-accent">
        <Wave amplitude={26} cycles={9} thickness={1.5} label="Variante accent (à discuter)" />
      </div>
      <p className="max-w-[66ch] text-caption text-text-muted">
        Étude statique : épaisseurs et densités de la ligne d’encre. La version temps réel
        (WebAudio) arrive avec la migration du Player ; sous prefers-reduced-motion elle restera un
        filet + mention textuelle du direct.
      </p>
    </div>
  ),
};
