// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { renderWithProviders } from '../test-utils';
import { TrendsModal } from './TrendsModal';
import { useAuthStore } from '../stores/authStore';
import { useLikedTracksStore } from '../stores/likedTracksStore';
import type { TrendsResult } from '../hooks/useTrends';

const TRENDS_URL = 'http://localhost:3000/api/trends';

const trendsPayload: TrendsResult = {
  week: [
    { title: 'Week One', artist: 'Artist A', artworkUrl: null, likes: 12 },
    { title: 'Week Two', artist: 'Artist B', artworkUrl: null, likes: 1 },
    { title: 'Week Three', artist: 'Artist C', artworkUrl: null, likes: 4 },
  ],
  allTime: [
    { title: 'All-Time One', artist: 'Artist D', artworkUrl: null, likes: 42 },
    { title: 'All-Time Two', artist: 'Artist E', artworkUrl: null, likes: 30 },
  ],
};

function mockTrends(payload: TrendsResult) {
  server.use(http.get(TRENDS_URL, () => HttpResponse.json(payload)));
}

beforeEach(() => {
  useLikedTracksStore.setState({ tracks: [], isLoading: false, error: null, likingTrackId: null });
  mockTrends(trendsPayload);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function waitForSessionHydration() {
  await waitFor(() => expect(useAuthStore.getState().isLoading).toBe(false));
}

describe('TrendsModal', () => {
  it('shows the week tab by default and switches to the all-time ranking', async () => {
    renderWithProviders(<TrendsModal isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Week One')).toBeInTheDocument();
    expect(screen.queryByText('All-Time One')).not.toBeInTheDocument();

    const weekTab = screen.getByRole('tab', { name: 'Cette semaine' });
    const allTimeTab = screen.getByRole('tab', { name: 'Depuis le début' });
    expect(weekTab).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(allTimeTab);

    expect(screen.getByText('All-Time One')).toBeInTheDocument();
    expect(screen.queryByText('Week One')).not.toBeInTheDocument();
    expect(allTimeTab).toHaveAttribute('aria-selected', 'true');
    expect(weekTab).toHaveAttribute('aria-selected', 'false');
  });

  it('shows the invitation copy on the week tab while the ranking has fewer than 3 entries', async () => {
    mockTrends({ ...trendsPayload, week: trendsPayload.week.slice(0, 2) });
    renderWithProviders(<TrendsModal isOpen={true} onClose={vi.fn()} />);

    expect(
      await screen.findByText(
        'Les tendances de la semaine se dessinent — aimez un morceau pour les faire bouger.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Week One')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Depuis le début' }));
    expect(screen.getByText('All-Time One')).toBeInTheDocument();
  });

  it('uses the singular caption for a single like and the plural otherwise', async () => {
    renderWithProviders(<TrendsModal isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText("12 auditeurs l'ont aimé")).toBeInTheDocument();
    expect(screen.getByText("1 auditeur l'a aimé")).toBeInTheDocument();
  });

  it('likes a trend entry through the shared like action when authenticated', async () => {
    let likeCalled = false;
    server.use(
      http.post('http://localhost:3000/api/track/like', () => {
        likeCalled = true;
        return HttpResponse.json({
          track: {
            id: 't1',
            userId: 'u1',
            title: 'Week One',
            artist: 'Artist A',
            album: null,
            artworkUrl: null,
            youtubeUrl: 'https://youtube.com/x',
            isrc: null,
            songlinkUrl: null,
            platformLinks: null,
            createdAt: new Date().toISOString(),
          },
        });
      })
    );

    renderWithProviders(<TrendsModal isOpen={true} onClose={vi.fn()} />);
    await waitForSessionHydration();
    act(() => {
      useAuthStore.setState({
        user: {
          id: 'u1',
          email: 'test@example.com',
          name: 'Test',
          image: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        isAuthenticated: true,
      });
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Aimer « Week One »' }));

    await waitFor(() => expect(likeCalled).toBe(true));
  });

  it('copies the radio share URL to the clipboard on share', async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    renderWithProviders(<TrendsModal isOpen={true} onClose={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Partager « Week One »' }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0]?.[0]).toContain('/t?artist=Artist%20A&title=Week%20One');
  });
});
