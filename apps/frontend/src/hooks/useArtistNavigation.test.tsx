// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { useArtistNavigation } from './useArtistNavigation';

function Probe({ name }: { name: string }) {
  const goToArtist = useArtistNavigation();
  const { pathname } = useLocation();

  return (
    <>
      <button
        onClick={() => {
          void goToArtist(name);
        }}
      >
        go
      </button>
      <span data-testid="path">{pathname}</span>
    </>
  );
}

function renderProbe(name: string) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Probe name={name} />
    </MemoryRouter>
  );
}

describe('useArtistNavigation', () => {
  it('navigates to the resolved artist page', async () => {
    renderProbe('Simon & Garfunkel');
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/artist/art_1/simon-garfunkel')
    );
  });

  it('stays put when the artist cannot be resolved', async () => {
    renderProbe('Unknown');
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    expect(screen.getByTestId('path')).not.toHaveTextContent('/artist');
  });
});
