import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = { title: 'Fondations/Typographie' };
export default meta;

export const Echelle: StoryObj = {
  render: () => (
    <div className="flex max-w-[66ch] flex-col gap-6">
      <p className="text-display">Aube Sonore, la radio qui se lève tôt</p>
      <p className="text-title">Titre de section — artiste et morceau</p>
      <p className="text-lead">
        Lead : une phrase d’accroche qui respire, pour les descriptions d’émissions.
      </p>
      <p className="text-body">
        Body : le texte courant. La longueur de ligne reste sous soixante-six caractères pour un
        confort de lecture optimal, et l’interlignage est sans unité.
      </p>
      <p className="text-caption text-text-muted">CAPTION — HORAIRES 06:12 · MÉTADONNÉES</p>
      <p className="text-body tabular-nums">Tabulaires : 06:12 — 11:00 — 23:58</p>
    </div>
  ),
};
