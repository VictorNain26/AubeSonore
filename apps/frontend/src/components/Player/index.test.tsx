// @vitest-environment jsdom
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router';
import { renderWithProviders } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNowPlayingStore } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import Player from './index';

vi.mock('./TrackArtwork', () => ({
  TrackArtwork: () => <div data-testid="artwork">Artwork</div>,
}));

vi.mock('./TrackMeta', () => ({
  TrackMeta: ({ onArtistInfo }: { onArtistInfo?: () => void }) => (
    <div data-testid="meta">
      Meta
      {onArtistInfo && <button onClick={onArtistInfo}>Info</button>}
    </div>
  ),
}));

vi.mock('./Antenna', () => ({
  Antenna: () => <div data-testid="antenna">Antenna</div>,
}));

vi.mock('./PlaybackControls', () => ({
  PlaybackControls: () => <div data-testid="controls">Controls</div>,
}));

vi.mock('./TrackActions', () => ({
  TrackActions: () => <div data-testid="track-actions">Actions</div>,
}));

vi.mock('./SecondaryControls', () => ({
  SecondaryControls: () => <div data-testid="secondary">Secondary</div>,
}));

vi.mock('./RecentTracks', () => ({
  RecentTracks: () => <div data-testid="recent-tracks">Recent Tracks</div>,
}));

function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

beforeEach(() => {
  useNowPlayingStore.setState({
    data: null,
    isConnected: false,
    error: null,
  });
  usePlayer.setState({ isPlaying: false });
});

describe('Player', () => {
  it('renders skeleton when no data', () => {
    useNowPlayingStore.setState({ data: null });
    renderWithProviders(<Player />);
    expect(screen.queryByTestId('artwork')).not.toBeInTheDocument();
    expect(screen.queryByTestId('meta')).not.toBeInTheDocument();
  });

  it('renders player with now playing data', () => {
    const mockData = {
      now_playing: {
        sh_id: 1,
        played_at: 0,
        song: {
          id: 'song-1',
          title: 'Test Track',
          artist: 'Test Artist',
          art: 'https://example.com/art.jpg',
        },
      },
      song_history: [],
    };

    useNowPlayingStore.setState({ data: mockData as never });
    usePlayer.setState({ isPlaying: true });
    renderWithProviders(<Player />);

    expect(screen.getByTestId('artwork')).toBeInTheDocument();
    expect(screen.getByTestId('meta')).toBeInTheDocument();
    expect(screen.getByTestId('antenna')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('track-actions')).toBeInTheDocument();
    expect(screen.getByTestId('secondary')).toBeInTheDocument();
  });

  it('renders RecentTracks rail', () => {
    const mockData = {
      now_playing: {
        sh_id: 1,
        played_at: 0,
        song: {
          id: 'song-1',
          title: 'Test Track',
          artist: 'Test Artist',
          art: 'https://example.com/art.jpg',
        },
      },
      song_history: [],
    };

    useNowPlayingStore.setState({ data: mockData as never });
    renderWithProviders(<Player />);

    expect(screen.getByTestId('recent-tracks')).toBeInTheDocument();
  });

  it('renders all main sections in data state', () => {
    const mockData = {
      now_playing: {
        sh_id: 1,
        played_at: 0,
        song: {
          id: 'song-1',
          title: 'Test Track',
          artist: 'Test Artist',
          art: 'https://example.com/art.jpg',
        },
      },
      song_history: [],
    };

    useNowPlayingStore.setState({ data: mockData as never });
    renderWithProviders(<Player />);

    expect(screen.getByTestId('artwork')).toBeInTheDocument();
    expect(screen.getByTestId('meta')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('secondary')).toBeInTheDocument();
    expect(screen.getByTestId('recent-tracks')).toBeInTheDocument();
  });

  it('navigates to the artist page from the track meta', async () => {
    const mockData = {
      now_playing: {
        sh_id: 1,
        played_at: 0,
        song: {
          id: 'song-1',
          title: 'Test Track',
          artist: 'Test Artist',
          art: 'https://example.com/art.jpg',
        },
      },
      song_history: [],
    };

    useNowPlayingStore.setState({ data: mockData as never });
    renderWithProviders(
      <>
        <Player />
        <LocationProbe />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Info' }));

    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/artist/art_1/simon-garfunkel')
    );
  });
});
