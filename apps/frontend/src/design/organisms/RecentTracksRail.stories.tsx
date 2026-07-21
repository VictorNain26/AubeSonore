import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecentTracksRail, type RailEntry } from './RecentTracksRail';

const meta: Meta<typeof RecentTracksRail> = {
  title: 'Organisms/RecentTracksRail',
  component: RecentTracksRail,
};
export default meta;

const noop = () => {};

const entries: RailEntry[] = [
  {
    id: 9,
    title: 'Song Nine',
    artist: 'Artist Nine',
    time: '06:12',
    isLiked: true,
    isLiking: false,
  },
  {
    id: 8,
    title: 'Song Eight',
    artist: 'Artist Eight',
    time: '05:58',
    isLiked: false,
    isLiking: false,
  },
  {
    id: 7,
    title: 'Song Seven',
    artist: 'Artist Seven',
    time: '05:41',
    isLiked: false,
    isLiking: true,
  },
  {
    id: 6,
    title: 'Song Six',
    artist: 'Artist Six',
    time: '05:20',
    isLiked: false,
    isLiking: false,
  },
  {
    id: 5,
    title: 'Song Five',
    artist: 'Artist Five',
    time: '05:02',
    isLiked: false,
    isLiking: false,
  },
  {
    id: 4,
    title: 'Song Four',
    artist: 'Artist Four',
    time: '04:48',
    isLiked: false,
    isLiking: false,
  },
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
