// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../stores/authStore';
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

const signOut = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 'u1',
      email: 'jane@example.com',
      name: 'Jane',
      image: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    isAuthenticated: true,
    isLoading: false,
    authError: null,
    signOut,
  });
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
  // Fifty-odd rows make the accessibility tree costly: `hidden: true` skips the
  // visibility checks (testing-library.com/docs/queries/byrole#performance).
  it('renders only 50 rows plus a button to reveal the remaining tracks', async () => {
    useLikedTracksStore.setState({ tracks: Array.from({ length: 60 }, (_, i) => makeTrack(i)) });
    render(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(50);
    const showMoreButton = screen.getByRole('button', {
      name: /afficher les 10 autres/i,
      hidden: true,
    });
    expect(showMoreButton).toBeInTheDocument();

    await userEvent.click(showMoreButton);

    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(60);
    expect(
      screen.queryByRole('button', { name: /afficher les .* autres/i, hidden: true })
    ).not.toBeInTheDocument();
  });

  it('resets the visible-count bound to 50 when the modal is closed and reopened', async () => {
    useLikedTracksStore.setState({ tracks: Array.from({ length: 60 }, (_, i) => makeTrack(i)) });
    const { rerender } = render(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    const showMoreButton = screen.getByRole('button', {
      name: /afficher les 10 autres/i,
      hidden: true,
    });
    await userEvent.click(showMoreButton);
    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(60);

    rerender(<LikedTracksModal isOpen={false} onClose={vi.fn()} />);
    rerender(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(50);
    expect(
      screen.getByRole('button', { name: /afficher les 10 autres/i, hidden: true })
    ).toBeInTheDocument();
  });

  it('does not render the show-more button when there are 50 or fewer tracks', () => {
    useLikedTracksStore.setState({ tracks: Array.from({ length: 50 }, (_, i) => makeTrack(i)) });
    render(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(50);
    expect(
      screen.queryByRole('button', { name: /afficher les .* autres/i, hidden: true })
    ).not.toBeInTheDocument();
  });

  it('heads the drawer with the account and signs out from it', async () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    const onClose = vi.fn();
    render(<LikedTracksModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('1 morceau gardé')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(onClose).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  it('dates each kept track and links it to the preferred platform', () => {
    useLikedTracksStore.setState({
      tracks: [
        {
          ...makeTrack(0),
          songlinkUrl: null,
          platformLinks: { spotify: 'https://open.spotify.com/track/x' },
        },
      ],
    });
    render(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('gardé le 1 janvier')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ouvrir « Track 0 » sur Spotify' })).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/x'
    );
  });

  it('counts nothing when the library is empty', async () => {
    render(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText("Rien de gardé pour l'instant.")).toBeInTheDocument();
    expect(screen.queryByText(/morceaux? gardés?$/)).not.toBeInTheDocument();
  });

  it('explains why the alert cannot be switched on when the browser has no push', async () => {
    render(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(
        screen.getByRole('switch', {
          name: "Me prévenir quand un artiste gardé repasse à l'antenne",
        })
      ).toBeDisabled()
    );
    expect(screen.getByText(/ajoutez d'abord le site à l'écran d'accueil/)).toBeInTheDocument();
  });

  it('keeps the track visible with an inline Undo on delete, and cancels the removal on undo', async () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    render(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Ne plus garder « Track 0 »' }));

    // The track stays in the store (pending), the row shows the inline Undo.
    expect(useLikedTracksStore.getState().tracks).toHaveLength(1);
    const undoButton = await screen.findByRole('button', { name: 'Annuler' });

    await userEvent.click(undoButton);

    expect(useLikedTracksStore.getState().tracks).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();
  });

  it('shows a countdown bar while a removal is pending, and removes it on undo', async () => {
    useLikedTracksStore.setState({ tracks: [makeTrack(0)] });
    render(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Ne plus garder « Track 0 »' }));

    const bar = await screen.findByRole('progressbar', {
      name: 'Temps restant avant suppression',
    });
    const valueNow = Number(bar.getAttribute('aria-valuenow'));
    expect(valueNow).toBeGreaterThan(90);
    expect(valueNow).toBeLessThanOrEqual(100);

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
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
      render(<LikedTracksModal isOpen={true} onClose={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: 'Ne plus garder « Track 0 »' }));
      // Within the grace period the removal has not been committed yet.
      expect(deleteCalled).toBe(false);

      await vi.advanceTimersByTimeAsync(5000);

      expect(deleteCalled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
