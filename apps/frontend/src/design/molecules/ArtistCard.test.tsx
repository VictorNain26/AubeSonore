// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ArtistCard } from './ArtistCard';

function renderCard(props: Partial<React.ComponentProps<typeof ArtistCard>> = {}) {
  return render(
    <MemoryRouter>
      <ArtistCard id="abc" name="Justice" slug="justice" image={null} {...props} />
    </MemoryRouter>
  );
}

describe('ArtistCard', () => {
  it('links to the decorated artist route', () => {
    renderCard();

    expect(screen.getByRole('link', { name: /justice/i })).toHaveAttribute(
      'href',
      '/artist/abc/justice'
    );
  });

  it('links to the bare route when there is no slug', () => {
    renderCard({ slug: undefined });

    expect(screen.getByRole('link', { name: /justice/i })).toHaveAttribute('href', '/artist/abc');
  });

  it('renders the image when provided', () => {
    renderCard({ image: 'https://cdn.deezer.com/j.jpg' });

    expect(screen.getByRole('img', { name: /justice/i })).toHaveAttribute(
      'src',
      'https://cdn.deezer.com/j.jpg'
    );
  });

  it('falls back to a named glyph without an image', () => {
    renderCard();

    expect(screen.getByRole('img', { name: /portrait de justice/i })).toBeInTheDocument();
  });
});
