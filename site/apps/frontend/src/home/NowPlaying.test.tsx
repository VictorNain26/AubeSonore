// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NowPlayingView, type NowPlayingViewProps } from './NowPlaying';

const playedAt = Math.floor(new Date(2026, 9, 1, 17, 1).getTime() / 1000);

function props(overrides: Partial<NowPlayingViewProps> = {}): NowPlayingViewProps {
  return {
    track: { title: 'Mimoun', artist: 'Mickey 3D', art: undefined, playedAt },
    isOnline: true,
    listeners: undefined,
    isKept: false,
    isKeeping: false,
    onToggleKeep: vi.fn(),
    onShare: vi.fn(),
    onOpenArtist: undefined,
    ...overrides,
  };
}

describe('NowPlayingView', () => {
  it('shows the start time, the title and the artist', () => {
    render(<NowPlayingView {...props()} />);

    expect(screen.getByText("17:01 — à l'antenne")).toBeInTheDocument();
    expect(screen.getByText('Mimoun')).toBeInTheDocument();
    expect(screen.getByText('Mickey 3D')).toBeInTheDocument();
  });

  it('shows the listener count only from two listeners upwards', () => {
    const { rerender } = render(<NowPlayingView {...props({ listeners: 1 })} />);
    expect(screen.queryByText(/à l'écoute/)).not.toBeInTheDocument();

    rerender(<NowPlayingView {...props({ listeners: 3 })} />);
    expect(screen.getByText(/3 à l'écoute/)).toBeInTheDocument();
  });

  it('toggles keep and reflects the kept state', async () => {
    const onToggleKeep = vi.fn();
    const { rerender } = render(<NowPlayingView {...props({ onToggleKeep })} />);

    await userEvent.click(screen.getByRole('button', { name: 'Garder' }));
    expect(onToggleKeep).toHaveBeenCalledOnce();

    rerender(<NowPlayingView {...props({ isKept: true })} />);
    expect(screen.getByRole('button', { name: 'Gardé' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers the artist panel only when there is a biography', () => {
    const { rerender } = render(<NowPlayingView {...props()} />);
    expect(screen.queryByRole('button', { name: "L'artiste" })).not.toBeInTheDocument();

    rerender(<NowPlayingView {...props({ onOpenArtist: vi.fn() })} />);
    expect(screen.getByRole('button', { name: "L'artiste" })).toBeInTheDocument();
  });

  it('says radio silence when the station is off air', () => {
    render(<NowPlayingView {...props({ isOnline: false })} />);
    expect(screen.getByText('Silence radio. Retour dans un instant.')).toBeInTheDocument();
  });
});
