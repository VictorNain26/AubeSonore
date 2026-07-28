// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders as render } from '../../test-utils';
import { RecentTracks } from './RecentTracks';
import { useNowPlayingStore, __resetNowPlayingStore } from '../../lib/azuracast/store';
import { makeNowPlaying } from '../../mocks/handlers';
import type { SongEntry } from '../../lib/azuracast';

const createMockEntry = (sh_id: number, title: string, artist: string): SongEntry => ({
  sh_id,
  played_at: 1_700_000_000 + sh_id * 100,
  duration: 200,
  playlist: 'main',
  streamer: '',
  is_request: false,
  song: {
    id: `song-${sh_id}`,
    art: '',
    text: `${title} - ${artist}`,
    artist,
    title,
    album: '',
    genre: '',
    isrc: '',
    lyrics: '',
  },
});

function makeTestNowPlaying() {
  const base = makeNowPlaying();
  return {
    ...base,
    now_playing: createMockEntry(10, 'Now', 'Artist Now'),
    song_history: [
      createMockEntry(10, 'Now', 'Artist Now'),
      createMockEntry(9, 'Song Nine', 'Artist Nine'),
      createMockEntry(8, 'Song Eight', 'Artist Eight'),
      createMockEntry(7, 'Song Seven', 'Artist Seven'),
      createMockEntry(6, 'Song Six', 'Artist Six'),
      createMockEntry(5, 'Song Five', 'Artist Five'),
      createMockEntry(4, 'Song Four', 'Artist Four'),
      createMockEntry(3, 'Song Three', 'Artist Three'),
      createMockEntry(2, 'Song Two', 'Artist Two'),
      createMockEntry(1, 'Song One', 'Artist One'),
    ],
  };
}

afterEach(() => {
  __resetNowPlayingStore();
});

describe('RecentTracks', () => {
  it('excludes the now-playing track from the rail', () => {
    useNowPlayingStore.setState({
      data: makeTestNowPlaying(),
      isConnected: true,
      error: null,
    });

    render(<RecentTracks />);

    expect(screen.queryByText('Now')).not.toBeInTheDocument();
    expect(screen.getByText('Song Nine')).toBeInTheDocument();
  });

  it('renders at most six items in a list', () => {
    useNowPlayingStore.setState({
      data: makeTestNowPlaying(),
      isConnected: true,
      error: null,
    });

    render(<RecentTracks />);

    expect(screen.getByText('Vient de passer')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('Song Nine')).toBeInTheDocument();
    expect(screen.getByText('Song Four')).toBeInTheDocument();
    expect(screen.queryByText('Song Three')).not.toBeInTheDocument();
  });

  it('shows partial-history notice when error occurs and entries exist', () => {
    useNowPlayingStore.setState({
      data: makeTestNowPlaying(),
      isConnected: false,
      error: 'Connection failed',
    });

    render(<RecentTracks />);

    expect(screen.getByText(/Historique partiel/)).toBeInTheDocument();
  });

  it('renders skeleton cards during initial load', () => {
    useNowPlayingStore.setState({
      data: null,
      isConnected: false,
      error: null,
    });

    render(<RecentTracks />);

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('recent-tracks-skeleton')).toHaveLength(4);
  });

  it('shows the empty message when history has no past tracks', () => {
    useNowPlayingStore.setState({
      data: { ...makeTestNowPlaying(), song_history: [] },
      isConnected: true,
      error: null,
    });

    render(<RecentTracks />);

    expect(screen.getByText("Aucun morceau pour l'instant.")).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
