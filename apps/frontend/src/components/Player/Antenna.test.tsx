// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePlayer } from '../../lib/player';
import { Antenna } from './Antenna';

vi.mock('./WaveformCanvas', () => ({
  WaveformCanvas: () => <canvas data-testid="wave" />,
}));

describe('Antenna', () => {
  it('renders nothing when not playing', () => {
    usePlayer.setState({ isPlaying: false });
    render(<Antenna />);
    expect(screen.queryByTestId('wave')).not.toBeInTheDocument();
  });

  it('shows the waveform when playing', () => {
    usePlayer.setState({ isPlaying: true });
    render(<Antenna />);
    expect(screen.getByTestId('wave')).toBeInTheDocument();
  });
});
