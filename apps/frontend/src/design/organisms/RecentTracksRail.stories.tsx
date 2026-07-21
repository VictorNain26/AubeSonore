import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecentTracksRail, type RailEntry } from './RecentTracksRail';

const meta: Meta<typeof RecentTracksRail> = {
  title: 'Organisms/RecentTracksRail',
  component: RecentTracksRail,
};
export default meta;

const noop = () => {};

const entries: RailEntry[] = [
  { id: 9, title: 'Song Nine', artist: 'Artist Nine', isLiked: true, isLiking: false },
  { id: 8, title: 'Song Eight', artist: 'Artist Eight', isLiked: false, isLiking: false },
  { id: 7, title: 'Song Seven', artist: 'Artist Seven', isLiked: false, isLiking: true },
  { id: 6, title: 'Song Six', artist: 'Artist Six', isLiked: false, isLiking: false },
  { id: 5, title: 'Song Five', artist: 'Artist Five', isLiked: false, isLiking: false },
  { id: 4, title: 'Song Four', artist: 'Artist Four', isLiked: false, isLiking: false },
];

export const Peuple: StoryObj = {
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

export const HistoriquePartiel: StoryObj = {
  render: () => (
    <RecentTracksRail entries={entries} isLoading={false} partial onToggle={noop} onShare={noop} />
  ),
};

export const Chargement: StoryObj = {
  render: () => (
    <RecentTracksRail entries={[]} isLoading partial={false} onToggle={noop} onShare={noop} />
  ),
};

export const Vide: StoryObj = {
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
