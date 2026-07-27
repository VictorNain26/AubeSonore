// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MiniPlayer } from './MiniPlayer';

const baseProps = {
  title: 'Around the World',
  artist: 'Daft Punk',
  artworkUrl: null,
  isPlaying: false,
  onTogglePlay: vi.fn(),
};

describe('MiniPlayer', () => {
  it('shows the current track', () => {
    render(<MiniPlayer {...baseProps} />);

    expect(screen.getByText('Around the World')).toBeInTheDocument();
    expect(screen.getByText('Daft Punk')).toBeInTheDocument();
  });

  it('calls onTogglePlay when the button is pressed', async () => {
    const onTogglePlay = vi.fn();
    render(<MiniPlayer {...baseProps} onTogglePlay={onTogglePlay} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('exposes a pause label while playing', () => {
    render(<MiniPlayer {...baseProps} isPlaying={true} />);

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('exposes a play label while stopped', () => {
    render(<MiniPlayer {...baseProps} />);

    expect(screen.getByRole('button', { name: /écouter|lecture/i })).toBeInTheDocument();
  });

  it('falls back to the glyph when there is no artwork', () => {
    render(<MiniPlayer {...baseProps} />);

    expect(screen.getByRole('img', { name: /pochette indisponible/i })).toBeInTheDocument();
  });

  it('renders the artwork when one is available', () => {
    render(<MiniPlayer {...baseProps} artworkUrl="https://cdn.example/art.jpg" />);

    expect(screen.getByRole('img', { name: /around the world/i })).toHaveAttribute(
      'src',
      'https://cdn.example/art.jpg'
    );
  });

  it('stays renderable while the antenna has no track yet', () => {
    render(<MiniPlayer {...baseProps} title={undefined} artist={undefined} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
