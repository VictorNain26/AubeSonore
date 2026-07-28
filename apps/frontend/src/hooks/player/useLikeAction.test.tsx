// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { toast } from 'sonner';
import { useLikeAction } from './useLikeAction';
import { useLikedTracksStore } from '../../stores/likedTracksStore';
import { useAuthStore } from '../../stores/authStore';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedToastSuccess = vi.mocked(toast.success);

function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      {children}
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('useLikeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
    useLikedTracksStore.setState({ tracks: [], likingTrackId: null, error: null });
  });

  it('offers a "Découvrir" toast action leading to the artist page after a like', async () => {
    const { result } = renderHook(() => useLikeAction(), { wrapper: Wrapper });

    await act(() => result.current.toggleLike('Test Track', 'Test Artist'));

    await waitFor(() => expect(mockedToastSuccess).toHaveBeenCalled());
    const [message, options] = mockedToastSuccess.mock.calls[0] as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(message).toBe('Ajouté à votre bibliothèque');
    expect(options.action.label).toBe('Découvrir Test Artist');

    act(() => options.action.onClick());
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/artist/art_1/simon-garfunkel')
    );
  });

  it('shows a plain toast when the artist has no page to land on', async () => {
    const { result } = renderHook(() => useLikeAction(), { wrapper: Wrapper });

    await act(() => result.current.toggleLike('Test Track', 'Unknown'));

    await waitFor(() => expect(mockedToastSuccess).toHaveBeenCalled());
    expect(mockedToastSuccess).toHaveBeenCalledWith('Ajouté à votre bibliothèque');
  });
});
