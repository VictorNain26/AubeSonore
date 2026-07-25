import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrendsModalView, type TrendEntryViewModel } from './TrendsModalView';

const week: TrendEntryViewModel[] = [
  {
    title: 'Nuits Sonores',
    artist: 'Aube Sonore',
    artworkUrl: 'https://picsum.photos/seed/aube-trend-1/96',
    likes: 12,
    isLiked: true,
  },
  {
    title: 'Réveil',
    artist: 'Les Ombres Claires',
    likes: 7,
    isLiked: false,
  },
  {
    title: 'Lumière du matin',
    artist: 'Cendres',
    artworkUrl: 'https://picsum.photos/seed/aube-trend-3/96',
    likes: 1,
    isLiked: false,
  },
];

const allTime: TrendEntryViewModel[] = [
  ...week,
  { title: 'Horizon', artist: 'Marée Basse', likes: 34, isLiked: false },
  { title: 'Premier Jour', artist: 'Cendres', likes: 21, isLiked: false },
];

const meta = {
  title: 'Organisms/TrendsModal',
  component: TrendsModalView,
  parameters: {
    docs: {
      description: {
        component:
          'Corps de la modale « Tendances » : onglets « Cette semaine » / « Depuis le début » et classement des morceaux les plus aimés par la communauté, avec aimer et partager sur chaque ligne. Le conteneur `TrendsModal` gère le fetch, la bibliothèque et les actions.',
      },
    },
  },
  argTypes: {
    isLoading: { control: 'boolean' },
    hasError: { control: 'boolean' },
  },
  args: {
    open: true,
    onOpenChange: () => {},
    week,
    allTime,
    isLoading: false,
    hasError: false,
    onLikeTrack: () => {},
    onShareTrack: () => {},
  },
} satisfies Meta<typeof TrendsModalView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Peuplee: Story = {};

export const SemaineEnConstruction: Story = {
  args: { week: week.slice(0, 2) },
  parameters: {
    docs: {
      description: {
        story:
          "Moins de 3 morceaux aimés cette semaine : l'onglet « Cette semaine » affiche l'état vide d'invitation à aimer.",
      },
    },
  },
};

export const Vide: Story = {
  args: { week: [], allTime: [] },
};

export const Chargement: Story = {
  args: { isLoading: true },
};

export const Erreur: Story = {
  args: { hasError: true },
};
