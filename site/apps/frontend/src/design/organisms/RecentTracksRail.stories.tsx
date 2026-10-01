import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecentTracksRail, type RailEntry } from './RecentTracksRail';

const meta: Meta<typeof RecentTracksRail> = {
  title: 'Organisms/RecentTracksRail',
  component: RecentTracksRail,
  parameters: {
    docs: {
      description: {
        component:
          'Section « Vient de passer » : piste horizontale des morceaux récents (fondu de bord et flèches au survol quand ça déborde, entrée animée du nouvel item), avec chargement (squelettes), historique partiel et état vide. Composite : `entries` est un tableau de données, pas de story par état d’args.',
      },
    },
  },
  argTypes: {
    isLoading: { control: 'boolean' },
    partial: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof RecentTracksRail>;

const noop = () => {};

const entries: RailEntry[] = [
  { id: 9, title: 'Song Nine', artist: 'Artist Nine', isLiked: true, isLiking: false },
  { id: 8, title: 'Song Eight', artist: 'Artist Eight', isLiked: false, isLiking: false },
  { id: 7, title: 'Song Seven', artist: 'Artist Seven', isLiked: false, isLiking: true },
  { id: 6, title: 'Song Six', artist: 'Artist Six', isLiked: false, isLiking: false },
  { id: 5, title: 'Song Five', artist: 'Artist Five', isLiked: false, isLiking: false },
  { id: 4, title: 'Song Four', artist: 'Artist Four', isLiked: false, isLiking: false },
];

export const Peuple: Story = {
  parameters: {
    docs: { description: { story: 'Historique complet, plusieurs morceaux avec états variés.' } },
  },
  render: () => (
    <RecentTracksRail
      entries={entries}
      isLoading={false}
      partial={false}
      onToggle={noop}
      onShare={noop}
    />
  ),
};

export const HistoriquePartiel: Story = {
  parameters: {
    docs: {
      description: { story: 'Historique incomplet : une mention explicative est affichée.' },
    },
  },
  render: () => (
    <RecentTracksRail entries={entries} isLoading={false} partial onToggle={noop} onShare={noop} />
  ),
};

export const Chargement: Story = {
  parameters: {
    docs: {
      description: { story: 'Chargement initial : squelettes tant qu’il n’y a aucune entrée.' },
    },
  },
  render: () => (
    <RecentTracksRail entries={[]} isLoading partial={false} onToggle={noop} onShare={noop} />
  ),
};

export const Vide: Story = {
  parameters: {
    docs: { description: { story: 'Aucun morceau récent à afficher.' } },
  },
  render: () => (
    <RecentTracksRail
      entries={[]}
      isLoading={false}
      partial={false}
      onToggle={noop}
      onShare={noop}
    />
  ),
};
