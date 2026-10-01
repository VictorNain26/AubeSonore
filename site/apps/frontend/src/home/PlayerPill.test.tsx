// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerPillView, type PlayerPillViewProps } from './PlayerPill';

function props(overrides: Partial<PlayerPillViewProps> = {}): PlayerPillViewProps {
  return {
    isPlaying: false,
    onTogglePlay: vi.fn(),
    title: 'Mimoun',
    artist: 'Mickey 3D',
    art: undefined,
    volume: 0.8,
    isMuted: false,
    onVolumeChange: vi.fn(),
    onToggleMute: vi.fn(),
    airPlay: null,
    ...overrides,
  };
}

describe('PlayerPillView', () => {
  it('invites to listen, then shows the listening state', async () => {
    const onTogglePlay = vi.fn();
    const { rerender } = render(<PlayerPillView {...props({ onTogglePlay })} />);

    expect(screen.getByText('Écouter')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Écouter le direct' }));
    expect(onTogglePlay).toHaveBeenCalledOnce();

    rerender(<PlayerPillView {...props({ isPlaying: true })} />);
    expect(screen.getByText('En écoute')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mettre en pause' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('shows the track on air', () => {
    render(<PlayerPillView {...props()} />);
    expect(screen.getByText('Mimoun')).toBeInTheDocument();
    expect(screen.getByText('— Mickey 3D')).toBeInTheDocument();
  });

  it('mutes and offers AirPlay only when available', async () => {
    const onToggleMute = vi.fn();
    const onOpen = vi.fn();
    const { rerender } = render(<PlayerPillView {...props({ onToggleMute })} />);

    expect(screen.queryByRole('button', { name: 'Diffuser via AirPlay' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Volume — couper le son' }));
    expect(onToggleMute).toHaveBeenCalledOnce();

    rerender(<PlayerPillView {...props({ airPlay: { isActive: false, onOpen } })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Diffuser via AirPlay' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
