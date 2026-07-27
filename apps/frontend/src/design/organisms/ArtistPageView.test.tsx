// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { ArtistPageView } from './ArtistPageView';

const profile: ArtistProfile = {
  id: 'abc',
  name: 'Daft Punk',
  slug: 'daft-punk',
  image: 'https://cdn-images.dzcdn.net/images/artist/dp.jpg',
  bio: 'Un duo français.',
  tags: ['french house'],
  listeners: 4200,
  similar: [{ id: 'j', name: 'Justice', image: null }],
  topTracks: [{ title: 'Around the World', url: 'https://deezer.com/track/1' }],
  links: [{ platform: 'official', url: 'https://daftpunk.com' }],
  playedOnRadio: [
    { title: 'Around the World', artist: 'Daft Punk', playedAt: '2026-07-27T10:00:00.000Z' },
  ],
  resolved: true,
};

function renderView(overrides: Partial<ArtistProfile> = {}) {
  return render(
    <MemoryRouter>
      <ArtistPageView profile={{ ...profile, ...overrides }} isLoading={false} error={null} />
    </MemoryRouter>
  );
}

describe('ArtistPageView', () => {
  it('renders the artist name as the page heading', () => {
    renderView();

    expect(screen.getByRole('heading', { level: 1, name: 'Daft Punk' })).toBeInTheDocument();
  });

  it('renders the bio and tags', () => {
    renderView();

    expect(screen.getByText('Un duo français.')).toBeInTheDocument();
    expect(screen.getByText('french house')).toBeInTheDocument();
  });

  it('hides the bio section entirely when there is none', () => {
    renderView({ bio: null });

    expect(screen.queryByText('Un duo français.')).not.toBeInTheDocument();
    expect(screen.queryByText(/biographie/i)).not.toBeInTheDocument();
  });

  it('hides the similar section when the list is empty', () => {
    renderView({ similar: [] });

    expect(screen.queryByRole('link', { name: /justice/i })).not.toBeInTheDocument();
  });

  it('falls back to a named glyph when there is no image', () => {
    renderView({ image: null });

    expect(screen.getByRole('img', { name: /portrait de daft punk/i })).toBeInTheDocument();
  });

  it('renders the radio floor even when every external source is empty', () => {
    renderView({ resolved: false, bio: null, tags: [], similar: [], topTracks: [], image: null });

    expect(screen.getByText(/passé sur aubesonore/i)).toBeInTheDocument();
    expect(screen.getByText('Around the World')).toBeInTheDocument();
  });

  it('hides the radio section before the antenna has played the artist', () => {
    renderView({ playedOnRadio: [] });

    expect(screen.queryByText(/passé sur aubesonore/i)).not.toBeInTheDocument();
  });

  it('still renders the platform links for an unresolved artist', () => {
    renderView({ resolved: false, bio: null, similar: [], image: null });

    expect(screen.getByRole('link', { name: /site officiel/i })).toHaveAttribute(
      'href',
      'https://daftpunk.com'
    );
  });

  it('shows a busy skeleton rather than the not-found state while loading', () => {
    render(
      <MemoryRouter>
        <ArtistPageView profile={null} isLoading={true} error={null} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
  });

  it('shows an error state instead of the content', () => {
    render(
      <MemoryRouter>
        <ArtistPageView profile={null} isLoading={false} error="Impossible de charger." />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /introuvable/i })).toBeInTheDocument();
    expect(screen.getByText('Impossible de charger.')).toBeInTheDocument();
  });
});
