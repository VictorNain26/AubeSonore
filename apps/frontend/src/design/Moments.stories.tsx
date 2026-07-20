import type { Meta, StoryObj } from '@storybook/react-vite';

const MOMENTS = [
  { id: 'dawn', label: 'Aube', hours: '6h – 10h' },
  { id: 'day', label: 'Jour', hours: '10h – 18h' },
  { id: 'dusk', label: 'Crépuscule', hours: '18h – 22h' },
  { id: 'night', label: 'Nuit', hours: '22h – 6h' },
] as const;

function Swatch({ token, name }: { token: string; name: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-hair)',
          background: `var(${token})`,
          border: '1px solid var(--line)',
        }}
      />
      <span>
        {name}
        <span className="ds-faint" style={{ display: 'block', fontSize: '0.8em' }}>
          {token}
        </span>
      </span>
    </div>
  );
}

function MomentPanel({ id, label, hours }: (typeof MOMENTS)[number]) {
  return (
    <section
      data-moment={id}
      className="ds"
      style={{
        padding: '1.5rem',
        borderRadius: 'var(--radius-hair)',
        border: '1px solid var(--line)',
        display: 'grid',
        gap: '1.25rem',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="ds-caption ds-muted">{label}</span>
        <span className="ds-faint" style={{ fontSize: 'var(--text-caption)' }}>
          {hours}
        </span>
      </header>
      <div>
        <div className="ds-title">Light The Fuse</div>
        <div className="ds-muted">KNIGHT$</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <Swatch token="--paper" name="papier" />
        <Swatch token="--ink" name="encre" />
        <Swatch token="--accent" name="accent" />
        <Swatch token="--live" name="live" />
      </div>
    </section>
  );
}

const meta = {
  title: 'Fondations/Moments',
  parameters: {
    docs: {
      description: {
        component:
          'Le papier suit l’heure : quatre moments, un seul accent chacun. La couleur change, la mise en page jamais. Contrastes AA garantis par `scripts/check-contrast.mjs`. La toolbar « Moment » applique le moment global à toutes les stories.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const LesQuatreMoments: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: 880 }}>
      {MOMENTS.map((m) => (
        <MomentPanel key={m.id} {...m} />
      ))}
    </div>
  ),
};

export const MomentCourant: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
      <p className="ds-muted">
        Ce panneau suit la toolbar « Moment » — c’est le comportement réel du site.
      </p>
      <div>
        <span
          className="ds-caption ds-muted"
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 'var(--radius-full)',
              background: 'var(--live)',
            }}
          />
          En direct
        </span>
        <h1 className="ds-display" style={{ marginTop: '0.5rem' }}>
          Light The Fuse
        </h1>
        <p className="ds-muted" style={{ fontSize: '1.25rem' }}>
          KNIGHT$
        </p>
      </div>
    </div>
  ),
};
