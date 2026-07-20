import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: '1.5rem',
        alignItems: 'baseline',
        padding: '1.25rem 0',
        borderTop: '1px solid var(--line)',
      }}
    >
      <span className="ds-faint" style={{ fontSize: 'var(--text-caption)', lineHeight: 1.6 }}>
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

const meta = {
  title: 'Fondations/Typographie',
  parameters: {
    docs: {
      description: {
        component:
          'Une seule famille : Inter Variable (400–650). Quatre tailles, pas d’italique, chiffres tabulaires. Les capitales espacées (caption) sont le seul usage des majuscules.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Echelle: Story = {
  render: () => (
    <div style={{ maxWidth: 820 }}>
      <Row label="display · clamp(40–64) · 650 · -0.03em — titre du morceau">
        <span className="ds-display">Light The Fuse</span>
      </Row>
      <Row label="title · 28 · 600 — titres de sections">
        <span className="ds-title">Vient de passer</span>
      </Row>
      <Row label="body · 16 · 400 — texte courant, + variantes encre 50 % / 35 %">
        <p style={{ maxWidth: '52ch' }}>
          AubeSonore diffuse des sons rares, des artistes émergents et des classiques oubliés.
        </p>
        <p className="ds-muted">KNIGHT$ · artiste</p>
        <p className="ds-faint">14:59 · heure tabulaire 0123456789</p>
      </Row>
      <Row label="caption · 12 · 500 · capitales espacées — seul usage des caps">
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
          En direct · Nuit
        </span>
      </Row>
    </div>
  ),
};
