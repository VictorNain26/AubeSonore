// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type * as MotionReact from 'motion/react';
import { RecentRail } from './RecentRail';
import type { SongEntry } from '../../lib/azuracast';

const useReducedMotionMock = vi.fn(() => false);

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof MotionReact>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => useReducedMotionMock(),
  };
});

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
  useReducedMotionMock.mockReturnValue(false);
});

describe('RecentRail', () => {
  it('renders the rail heading, listitems and track info from useRecentHistory', () => {
    render(<RecentRail />);

    expect(screen.getByText('Vient de passer')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Song One')).toBeInTheDocument();
    expect(screen.getByText('Artist One')).toBeInTheDocument();
    expect(screen.getByText('Song Two')).toBeInTheDocument();
    expect(screen.getByText('Artist Two')).toBeInTheDocument();
  });

  it('does not attach custom wheel/pointer listeners or rotate style when reduced motion is preferred', () => {
    const addEventListenerSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener');
    useReducedMotionMock.mockReturnValue(true);

    render(<RecentRail />);

    const railElement = screen.getByRole('list');
    const customListenerTypesOnRail = addEventListenerSpy.mock.calls
      .filter((_, i) => addEventListenerSpy.mock.contexts[i] === railElement)
      .map(([type]) => type)
      .filter((type) => ['wheel', 'pointerdown', 'pointermove', 'pointerup'].includes(type));
    expect(customListenerTypesOnRail).toHaveLength(0);

    const [firstItem] = screen.getAllByRole('listitem');
    expect(firstItem?.parentElement?.style.rotate).toBeFalsy();
  });
});
