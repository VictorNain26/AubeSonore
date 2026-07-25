// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useLikeAction } from './useLikeAction';
import { useLikedTracksStore } from '../../stores/likedTracksStore';
import { useAuthStore } from '../../stores/authStore';
import { useArtistPanelStore } from '../../stores/artistPanelStore';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedToastSuccess = vi.mocked(toast.success);

describe('useLikeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
    useLikedTracksStore.setState({ tracks: [], likingTrackId: null, error: null });
    useArtistPanelStore.setState({ artistName: null });
  });

  it('offers a "Découvrir" toast action opening the artist panel after a like', async () => {
    const { result } = renderHook(() => useLikeAction());

    await act(() => result.current.toggleLike('Test Track', 'Test Artist'));

    await waitFor(() => expect(mockedToastSuccess).toHaveBeenCalled());
    const [message, options] = mockedToastSuccess.mock.calls[0] as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(message).toBe('Ajouté à votre bibliothèque');
    expect(options.action.label).toBe('Découvrir Test Artist');

    act(() => options.action.onClick());
    expect(useArtistPanelStore.getState().artistName).toBe('Test Artist');
  });

  it('shows a plain toast when the artist has no bio', async () => {
    const { result } = renderHook(() => useLikeAction());

    await act(() => result.current.toggleLike('Test Track', 'Unknown'));

    await waitFor(() => expect(mockedToastSuccess).toHaveBeenCalled());
    expect(mockedToastSuccess).toHaveBeenCalledWith('Ajouté à votre bibliothèque');
  });
});
