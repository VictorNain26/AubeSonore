// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Toaster } from 'sonner';
import { server } from '../mocks/server';
import { renderWithProviders } from '../test-utils';
import { LikedTracksModal } from './LikedTracksModal';
import { useLikedTracksStore } from '../stores/likedTracksStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import type { LikedTrack } from '../lib/api';

function makeTrack(index: number): LikedTrack {
  return {
    id: `track-${index}`,
    userId: 'u1',
    title: `Track ${index}`,
    artist: `Artist ${index}`,
    album: null,
    artworkUrl: null,
    youtubeUrl: `https://youtube.com/watch?v=${index}`,
    isrc: null,
    songlinkUrl: null,
    platformLinks: null,
    createdAt: new Date(2024, 0, index + 1).toISOString(),
  };
}

beforeEach(() => {
  useLikedTracksStore.setState({
    tracks: [],
    isLoading: false,
    error: null,
    likingTrackId: null,
  });
  usePreferencesStore.setState({
    preferences: {
      userId: 'u1',
      preferredPlatform: 'spotify',
      updatedAt: new Date().toISOString(),
    },
  });
});

describe('LikedTracksModal', () => {
  it('renders only 50 rows plus a button to reveal the remaining tracks', async () => {
    useLikedTracksStore.setState({ tracks: Array.from({ length: 60 }, (_, i) => makeTrack(i)) });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    const showMoreButton = screen.getByRole('button', { name: /afficher les 10 autres/i });
    expect(showMoreButton).toBeInTheDocument();

    await userEvent.click(showMoreButton);

    expect(screen.getAllByRole('listitem')).toHaveLength(60);
    expect(
      screen.queryByRole('button', { name: /afficher les .* autres/i })
    ).not.toBeInTheDocument();
  });

  it('resets the visible-count bound to 50 when the modal is closed and reopened', async () => {
    useLikedTracksStore.setState({ tracks: Array.from({ length: 60 }, (_, i) => makeTrack(i)) });
    const { rerender } = renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    const showMoreButton = screen.getByRole('button', { name: /afficher les 10 autres/i });
    await userEvent.click(showMoreButton);
    expect(screen.getAllByRole('listitem')).toHaveLength(60);

    rerender(<LikedTracksModal isOpen={false} onClose={vi.fn()} />);
    rerender(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    expect(screen.getByRole('button', { name: /afficher les 10 autres/i })).toBeInTheDocument();
  });

  it('does not render the show-more button when there are 50 or fewer tracks', () => {
    useLikedTracksStore.setState({ tracks: Array.from({ length: 50 }, (_, i) => makeTrack(i)) });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    expect(
      screen.queryByRole('button', { name: /afficher les .* autres/i })
    ).not.toBeInTheDocument();
  });

  it('marks the delete button reachable via focus and coarse pointers', () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    const deleteButton = screen.getByRole('button', { name: 'Retirer de ma bibliothèque' });
    expect(deleteButton.className).toContain('focus-visible:opacity-100');
    expect(deleteButton.className).toContain('pointer-coarse:opacity-100');
  });

  it('applies scroll-pt-16 to the modal scroll container so a focused row clears the sticky header', () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('modal-scroll-container').className).toContain('scroll-pt-16');
  });

  it('shows an undo toast after a successful delete and re-adds the track on undo, keeping album and isrc', async () => {
    server.use(
      http.post('http://localhost:3000/api/track/like', async ({ request }) => {
        const body = (await request.json()) as {
          title: string;
          artist: string;
          album?: string;
          isrc?: string;
        };
        return HttpResponse.json({
          track: {
            id: 't1',
            userId: 'u1',
            title: body.title,
            artist: body.artist,
            album: body.album ?? null,
            artworkUrl: null,
            youtubeUrl: 'https://youtube.com/x',
            isrc: body.isrc ?? null,
            songlinkUrl: null,
            platformLinks: null,
            createdAt: new Date().toISOString(),
          },
        });
      })
    );
    useLikedTracksStore.setState({
      tracks: [{ ...makeTrack(0), album: 'Some Album', isrc: 'US1234567890' }],
    });
    renderWithProviders(
      <>
        <LikedTracksModal isOpen={true} onClose={vi.fn()} />
        <Toaster />
      </>
    );

    const deleteButton = screen.getByRole('button', { name: 'Retirer de ma bibliothèque' });
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(useLikedTracksStore.getState().tracks).toHaveLength(0);
    });

    const undoButton = await screen.findByRole('button', { name: 'Annuler' });
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(useLikedTracksStore.getState().tracks).toHaveLength(1);
    });
    const restored = useLikedTracksStore.getState().tracks[0];
    expect(restored?.album).toBe('Some Album');
    expect(restored?.isrc).toBe('US1234567890');
  });
});
