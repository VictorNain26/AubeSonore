// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
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
  // The modal refetches liked tracks on open; keep the mocked GET consistent
  // with whatever the test placed in the store so the refetch is a no-op.
  server.use(
    http.get('http://localhost:3000/api/track/like', () =>
      HttpResponse.json(useLikedTracksStore.getState().tracks)
    )
  );
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

  it('reveals every row action on hover/focus and keeps them visible for coarse pointers', () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    const actions = screen.getByTestId('row-actions');
    expect(actions.className).toContain('opacity-0');
    expect(actions.className).toContain('group-hover:opacity-100');
    expect(actions.className).toContain('group-focus-within:opacity-100');
    expect(actions.className).toContain('pointer-coarse:opacity-100');
  });

  it('applies scroll-pt-16 to the modal scroll container so a focused row clears the sticky header', () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('modal-scroll-container').className).toContain('scroll-pt-16');
  });

  it('hides the scrollbar on the scroll container', () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('modal-scroll-container').className).toContain('scrollbar-none');
  });

  it('highlights the hovered row so the revealed actions read as one unit', () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('listitem').className).toContain('hover:bg-surface');
  });

  it('marks the platform picker as a dropdown with a chevron that rotates when open', () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    const picker = screen.getByRole('button', { name: 'Sélectionner la plateforme préférée' });
    expect(within(picker).getByTestId('platform-picker-chevron')).toBeInTheDocument();
    expect(picker.className).toContain('[&[data-popup-open]>svg]:rotate-180');
  });

  it('keeps the track visible with an inline Undo on delete, and cancels the removal on undo', async () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Retirer de ma bibliothèque' }));

    // The track stays in the store (pending), the row shows the inline Undo.
    expect(useLikedTracksStore.getState().tracks).toHaveLength(1);
    const undoButton = await screen.findByRole('button', { name: 'Annuler' });

    await userEvent.click(undoButton);

    expect(useLikedTracksStore.getState().tracks).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();
  });

  it('fires the unlike request only after the grace period elapses', async () => {
    let deleteCalled = false;
    server.use(
      http.delete('http://localhost:3000/api/track/like/:id', () => {
        deleteCalled = true;
        return HttpResponse.json({ message: 'ok' });
      })
    );
    vi.useFakeTimers();
    try {
      useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
      renderWithProviders(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: 'Retirer de ma bibliothèque' }));
      // Within the grace period the removal has not been committed yet.
      expect(deleteCalled).toBe(false);

      await vi.advanceTimersByTimeAsync(5000);

      expect(deleteCalled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
