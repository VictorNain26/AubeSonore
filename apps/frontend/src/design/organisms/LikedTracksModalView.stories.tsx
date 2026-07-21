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
    linkIsSearch: false,
    isDeleting: false,
  },
  {
    id: 't2',
    title: 'Réveil',
    artist: 'Les Ombres Claires',
    linkHref: 'https://open.spotify.com/search/x',
    linkIsSearch: true,
    isDeleting: false,
  },
  {
    id: 't3',
    title: 'Lumière du matin',
    artist: 'Cendres',
    artworkUrl: 'https://picsum.photos/seed/aube-liked-3/96',
    linkHref: 'https://open.spotify.com/track/3',
    linkIsSearch: false,
    isDeleting: true,
  },
];

const meta = {
  title: 'Features/LikedTracks/Modal',
  component: LikedTracksModalView,
  parameters: {
    docs: {
      description: {
        component:
          'Corps de la modale « Ma bibliothèque » : actions de bibliothèque (rafraîchir les liens, exporter en CSV, plateforme préférée) et la liste des morceaux aimés (chargement / vide / peuplée). Le conteneur `LikedTracksModal` gère les stores et le flux de suppression.',
      },
    },
  },
  argTypes: {
    isLoading: { control: 'boolean' },
    isRefreshing: { control: 'boolean' },
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
    isRefreshing: false,
    onRefreshAll: () => {},
    onExport: () => {},
    platforms,
    selectedPlatformId: 'spotify',
    onSelectPlatform: () => {},
    onDeleteTrack: () => {},
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
