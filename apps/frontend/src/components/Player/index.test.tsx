// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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

vi.mock('./SecondaryControls', () => ({
  SecondaryControls: () => <div data-testid="secondary">Secondary</div>,
}));

vi.mock('./ArtistContext', () => ({
  ArtistContext: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="artist-context">Artist Context</div> : null,
}));

vi.mock('./ArtistBio', () => ({
  ArtistBio: ({ onOpenPanel }: { onOpenPanel?: () => void }) => (
    <div data-testid="artist-bio">
      Bio
      {onOpenPanel && <button onClick={onOpenPanel}>Open</button>}
    </div>
  ),
}));

vi.mock('./RecentTracks', () => ({
  RecentTracks: () => <div data-testid="recent-tracks">Recent Tracks</div>,
}));

vi.mock('../../hooks/useArtistInfo', () => ({
  useArtistInfo: vi.fn(() => ({ data: null })),
}));

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
    render(<Player />);
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
    render(<Player />);

    expect(screen.getByTestId('artwork')).toBeInTheDocument();
    expect(screen.getByTestId('meta')).toBeInTheDocument();
    expect(screen.getByTestId('antenna')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
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
    render(<Player />);

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
    render(<Player />);

    expect(screen.getByTestId('artwork')).toBeInTheDocument();
    expect(screen.getByTestId('meta')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('secondary')).toBeInTheDocument();
    expect(screen.getByTestId('artist-bio')).toBeInTheDocument();
    expect(screen.getByTestId('recent-tracks')).toBeInTheDocument();
  });

  it('closes artist panel when track changes', () => {
    const mockData = {
      now_playing: {
        sh_id: 1,
        played_at: 0,
        song: {
          id: 'song-1',
          title: 'Artist A',
          artist: 'Artist A',
          art: 'https://example.com/art.jpg',
        },
      },
      song_history: [],
    };

    useNowPlayingStore.setState({ data: mockData as never });
    render(<Player />);

    const secondData = {
      now_playing: {
        sh_id: 2,
        played_at: 1,
        song: {
          id: 'song-2',
          title: 'Artist B',
          artist: 'Artist B',
          art: 'https://example.com/art.jpg',
        },
      },
      song_history: [mockData.now_playing],
    };

    useNowPlayingStore.setState({ data: secondData as never });
    expect(screen.queryByTestId('artist-context')).not.toBeInTheDocument();
  });
});
