import type { Meta, StoryObj } from '@storybook/react-vite';
import { LikedTracksModalView, type LikedTrackViewModel } from './LikedTracksModalView';

const platforms = [
  { id: 'spotify', name: 'Spotify' },
  { id: 'appleMusic', name: 'Apple Music' },
  { id: 'deezer', name: 'Deezer' },
];

const tracks: LikedTrackViewModel[] = [
  {
    id: 't1',
    title: 'Nuits Sonores',
    artist: 'Aube Sonore',
    artworkUrl: 'https://picsum.photos/seed/aube-liked-1/96',
    linkHref: 'https://open.spotify.com/track/1',
    pendingRemoval: false,
  },
  {
    id: 't2',
    title: 'Réveil',
    artist: 'Les Ombres Claires',
    linkHref: null,
    pendingRemoval: false,
  },
  {
    id: 't3',
    title: 'Lumière du matin',
    artist: 'Cendres',
    artworkUrl: 'https://picsum.photos/seed/aube-liked-3/96',
    linkHref: 'https://open.spotify.com/track/3',
    pendingRemoval: true,
  },
];

const meta = {
  title: 'Organisms/LikedTracksModal',
  component: LikedTracksModalView,
  parameters: {
    docs: {
      description: {
        component:
          'Corps de la modale « Ma bibliothèque » : sélecteur de plateforme préférée et liste des morceaux aimés (chargement / vide / peuplée) avec ouvrir, partager et retrait annulable. Le conteneur `LikedTracksModal` gère les stores, la résolution des liens et le minuteur de retrait.',
      },
    },
  },
  argTypes: {
    isLoading: { control: 'boolean' },
    hiddenCount: { control: 'number' },
  },
  args: {
    open: true,
    onOpenChange: () => {},
    totalCount: tracks.length,
    isLoading: false,
    tracks,
    hiddenCount: 0,
    onShowMore: () => {},
    platforms,
    selectedPlatformId: 'spotify',
    onSelectPlatform: () => {},
    onShareTrack: () => {},
    onDeleteTrack: () => {},
    onUndoTrack: () => {},
  },
} satisfies Meta<typeof LikedTracksModalView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Peuplee: Story = {};

export const Vide: Story = {
  args: { totalCount: 0, tracks: [] },
};

export const Chargement: Story = {
  args: { isLoading: true },
};

const manyTracks: LikedTrackViewModel[] = Array.from({ length: 30 }, (_, i) => ({
  id: `t${i + 1}`,
  title: `Morceau ${i + 1}`,
  artist: i % 2 === 0 ? 'Aube Sonore' : 'Les Ombres Claires',
  linkHref: `https://open.spotify.com/track/${i + 1}`,
  pendingRemoval: false,
}));

export const ListeLongue: Story = {
  args: { totalCount: 50, tracks: manyTracks, hiddenCount: 20 },
  parameters: {
    docs: {
      description: {
        story:
          'Liste longue : la zone défile sous l’en-tête « Ouvrir avec » (sticky), plafonnée à 70dvh, avec la pagination « Afficher les N autres » en pied.',
      },
    },
  },
};
