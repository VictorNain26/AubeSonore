// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistPanelStore } from '../../stores/artistPanelStore';
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
    useArtistPanelStore.setState({ artistName: null });
  });

  it('opens the dialog named after the panel artist', () => {
    mockedUseArtistInfo.mockReturnValue({
      data: { bio: 'A biography.', tags: ['jazz'], similarArtists: ['Other'], listeners: 0 },
      isLoading: false,
    });
    useArtistPanelStore.setState({ artistName: 'Some Artist' });
    render(<ArtistContext />);
    expect(screen.getByRole('dialog', { name: 'Some Artist' })).toBeInTheDocument();
    expect(screen.getByText('A biography.')).toBeInTheDocument();
    expect(screen.getByText('jazz')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('renders no dialog when the panel is closed', () => {
    mockedUseArtistInfo.mockReturnValue({ data: null, isLoading: false });
    render(<ArtistContext />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the panel when the dialog close button is clicked', () => {
    mockedUseArtistInfo.mockReturnValue({ data: null, isLoading: false });
    useArtistPanelStore.setState({ artistName: 'Some Artist' });
    render(<ArtistContext />);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(useArtistPanelStore.getState().artistName).toBeNull();
  });
});
