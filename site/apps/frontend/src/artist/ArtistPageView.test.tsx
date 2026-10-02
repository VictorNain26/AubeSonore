// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { makeArtistProfile } from '../mocks/handlers';
import { ArtistPageView, type ArtistPageState } from './ArtistPageView';

function show(state: ArtistPageState) {
  return render(<ArtistPageView state={state} />, { wrapper: MemoryRouter });
}

describe('ArtistPageView', () => {
  it('names the artist and lists what the antenna played', () => {
    show({ status: 'ready', profile: makeArtistProfile() });

    expect(screen.getByRole('heading', { level: 1, name: 'Hania Rani' })).toBeInTheDocument();
    expect(screen.getByText('modern classical · piano')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Passé sur AubeSonore' })).toBeInTheDocument();
    expect(screen.getByText('F Major')).toBeInTheDocument();
  });

  it('says so when no play is recorded yet', () => {
    show({ status: 'ready', profile: makeArtistProfile({ playedOnRadio: [] }) });

    expect(screen.getByText("Aucun passage enregistré pour l'instant.")).toBeInTheDocument();
  });

  it('links a similar artist only when the site has their page', () => {
    show({
      status: 'ready',
      profile: makeArtistProfile({
        similar: [
          { name: 'Nils Frahm', image: null, page: { id: 'a-2', slug: 'nils-frahm' } },
          { name: 'Ólafur Arnalds', image: null, page: null },
        ],
      }),
    });

    expect(screen.getByRole('link', { name: 'Nils Frahm' })).toHaveAttribute(
      'href',
      '/artist/a-2/nils-frahm'
    );
    expect(screen.queryByRole('link', { name: 'Ólafur Arnalds' })).not.toBeInTheDocument();
    expect(screen.getByText('Ólafur Arnalds')).toBeInTheDocument();
  });

  it('hides the sections no source could fill', () => {
    show({ status: 'ready', profile: makeArtistProfile() });

    expect(screen.queryByRole('heading', { name: 'Biographie' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dans la même veine' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Écouter ailleurs' })).not.toBeInTheDocument();
  });

  it('opens outside links in a new tab, named by platform', () => {
    show({
      status: 'ready',
      profile: makeArtistProfile({
        links: [{ platform: 'bandcamp', url: 'https://haniarani.bandcamp.com' }],
        topTracks: [{ title: 'Eden', url: 'https://www.deezer.com/track/1' }],
      }),
    });

    expect(screen.getByRole('link', { name: 'Bandcamp' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /Eden/ })).toHaveAttribute(
      'href',
      'https://www.deezer.com/track/1'
    );
  });

  it('says the artist is not found, or that the page failed', () => {
    const { rerender } = show({ status: 'missing' });
    expect(screen.getByRole('heading', { name: 'Artiste introuvable.' })).toBeInTheDocument();

    rerender(<ArtistPageView state={{ status: 'error' }} />);
    expect(screen.getByRole('heading', { name: 'Page indisponible.' })).toBeInTheDocument();
  });

  it('leads back to the live from the header', () => {
    show({ status: 'loading' });

    expect(screen.getByRole('link', { name: 'Revenir au direct' })).toHaveAttribute('href', '/');
  });
});
