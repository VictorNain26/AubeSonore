// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StationLog } from './StationLog';
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

const entries: SongEntry[] = [
  createMockEntry(1, 'Song One', 'Artist One'),
  createMockEntry(2, 'Song Two', 'Artist Two'),
  createMockEntry(3, 'Song Three', 'Artist Three'),
  createMockEntry(4, 'Song Four', 'Artist Four'),
  createMockEntry(5, 'Song Five', 'Artist Five'),
  createMockEntry(6, 'Song Six', 'Artist Six'),
  createMockEntry(7, 'Song Seven', 'Artist Seven'),
  createMockEntry(8, 'Song Eight', 'Artist Eight'),
  createMockEntry(9, 'Song Nine', 'Artist Nine'),
  createMockEntry(10, 'Song Ten', 'Artist Ten'),
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
  it('renders exactly 6 rows when given 10 entries', () => {
    render(<StationLog />);

    expect(screen.getByText('Vient de passer')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('Song One')).toBeInTheDocument();
    expect(screen.getByText('Song Six')).toBeInTheDocument();
    expect(screen.queryByText('Song Seven')).not.toBeInTheDocument();
  });

  it('shows the empty state when there is no history', () => {
    useRecentHistoryMock.mockReturnValue({ entries: [], isLoading: false, error: null });

    render(<StationLog />);

    expect(screen.getByText(/Aucun morceau/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
