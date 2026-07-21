// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Thumbnail } from './Thumbnail';

describe('Thumbnail', () => {
  it('renders the artwork image when a src is given', () => {
    render(<Thumbnail src="https://example.test/a.jpg" alt="Pochette" />);
    expect(screen.getByRole('img', { name: 'Pochette' })).toHaveAttribute(
      'src',
      'https://example.test/a.jpg'
    );
  });

  it('renders no image when no src is given', () => {
    render(<Thumbnail alt="Pochette" />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('removes the image after a load error', () => {
    render(<Thumbnail src="https://example.test/broken.jpg" alt="Pochette" />);
    fireEvent.error(screen.getByRole('img', { name: 'Pochette' }));
    expect(screen.queryByRole('img')).toBeNull();
  });
});
