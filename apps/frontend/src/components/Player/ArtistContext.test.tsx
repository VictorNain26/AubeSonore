// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { ArtistContext } from './ArtistContext';

vi.mock('../../hooks/useArtistInfo');

const mockedUseArtistInfo = vi.mocked(useArtistInfo);

describe('ArtistContext', () => {
  beforeEach(() => {
    useNowPlayingStore.setState({
      data: {
        now_playing: {
          sh_id: 1,
          played_at: 0,
          song: { title: 'T', artist: 'Some Artist', art: '' },
        },
        listeners: { current: 0 },
        live: { is_live: false, streamer_name: '', broadcast_start: null },
      } as never,
    });
  });

  it('opens the dialog named after the artist when isOpen is true', () => {
    mockedUseArtistInfo.mockReturnValue({
      data: { bio: 'A biography.', tags: ['jazz'], similarArtists: ['Other'], listeners: 0 },
      isLoading: false,
    });
    render(<ArtistContext isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Some Artist' })).toBeInTheDocument();
    expect(screen.getByText('A biography.')).toBeInTheDocument();
    expect(screen.getByText('jazz')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('renders no dialog when isOpen is false', () => {
    mockedUseArtistInfo.mockReturnValue({ data: null, isLoading: false });
    render(<ArtistContext isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when the dialog close button is clicked', () => {
    mockedUseArtistInfo.mockReturnValue({ data: null, isLoading: false });
    const onClose = vi.fn();
    render(<ArtistContext isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
