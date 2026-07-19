// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StationLog } from './StationLog';
import type { SongEntry } from '../../lib/azuracast';

const entries: SongEntry[] = [
  {
    sh_id: 1,
    played_at: 1_700_000_000,
    duration: 200,
    playlist: 'main',
    streamer: '',
    is_request: false,
    song: {
      id: 'a',
      art: '',
      text: 'Song One - Artist One',
      artist: 'Artist One',
      title: 'Song One',
      album: '',
      genre: '',
      isrc: '',
      lyrics: '',
    },
  },
  {
    sh_id: 2,
    played_at: 1_700_000_500,
    duration: 180,
    playlist: 'main',
    streamer: '',
    is_request: false,
    song: {
      id: 'b',
      art: '',
      text: 'Song Two - Artist Two',
      artist: 'Artist Two',
      title: 'Song Two',
      album: '',
      genre: '',
      isrc: '',
      lyrics: '',
    },
  },
];

const useRecentHistoryMock = vi.fn(() => ({ entries, isLoading: false, error: null }));

vi.mock('../../hooks/useRecentHistory', () => ({
  useRecentHistory: () => useRecentHistoryMock(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  useRecentHistoryMock.mockReturnValue({ entries, isLoading: false, error: null });
});

describe('StationLog', () => {
  it('renders the log heading, one row per entry and track info from useRecentHistory', () => {
    render(<StationLog />);

    expect(screen.getByText('Vient de passer')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Song One')).toBeInTheDocument();
    expect(screen.getByText('Artist One')).toBeInTheDocument();
    expect(screen.getByText('Song Two')).toBeInTheDocument();
    expect(screen.getByText('Artist Two')).toBeInTheDocument();
  });

  it('shows the empty state when there is no history', () => {
    useRecentHistoryMock.mockReturnValue({ entries: [], isLoading: false, error: null });

    render(<StationLog />);

    expect(screen.getByText(/Aucun morceau/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
