// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useArtistPage } from './useArtistPage';

describe('useArtistPage', () => {
  it('resolves the page of the artist on air', async () => {
    const { result } = renderHook(() => useArtistPage('Hania Rani'));

    await waitFor(() => expect(result.current).toEqual({ id: 'a-1', slug: 'hania-rani' }));
  });

  it('stays null for an artist without a page', async () => {
    const { result } = renderHook(() => useArtistPage('Unknown'));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current).toBeNull();
  });

  it("never shows the previous artist's page for the next one", async () => {
    const { result, rerender } = renderHook(({ artist }) => useArtistPage(artist), {
      initialProps: { artist: 'Hania Rani' },
    });
    await waitFor(() => expect(result.current).not.toBeNull());

    rerender({ artist: 'Unknown' });

    expect(result.current).toBeNull();
  });
});
