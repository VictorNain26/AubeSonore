// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Thumbnail } from './Thumbnail';

describe('Thumbnail', () => {
  it('renders the artwork image when a src is given', () => {
    render(<Thumbnail src="https://example.test/a.jpg" alt="Pochette" />);
    const img = screen.queryByRole('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://example.test/a.jpg');
  });

  it('renders the fallback icon when no src is given', () => {
    render(<Thumbnail />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('falls back to the icon after an image load error', () => {
    render(<Thumbnail src="https://example.test/broken.jpg" />);
    fireEvent.error(screen.queryByRole('img')!);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
