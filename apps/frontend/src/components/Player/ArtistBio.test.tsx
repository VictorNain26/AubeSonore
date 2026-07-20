// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { ArtistBio } from './ArtistBio';

vi.mock('../../hooks/useArtistInfo');

const mockedUseArtistInfo = vi.mocked(useArtistInfo);

describe('ArtistBio', () => {
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

  it('shows skeletons and no text while loading', () => {
    mockedUseArtistInfo.mockReturnValue({ data: null, isLoading: true });
    render(<ArtistBio onOpenPanel={vi.fn()} />);
    expect(screen.queryByText(/Some Artist/)).not.toBeInTheDocument();
  });

  it('renders nothing when there is no bio', () => {
    mockedUseArtistInfo.mockReturnValue({ data: null, isLoading: false });
    const { container } = render(<ArtistBio onOpenPanel={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the clamped bio and calls onOpenPanel', () => {
    mockedUseArtistInfo.mockReturnValue({
      data: { bio: 'A long biography.', tags: [], similarArtists: [], listeners: 0 },
      isLoading: false,
    });
    const onOpenPanel = vi.fn();
    render(<ArtistBio onOpenPanel={onOpenPanel} />);
    expect(screen.getByText('A long biography.')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/En savoir plus/));
    expect(onOpenPanel).toHaveBeenCalledOnce();
  });
});
