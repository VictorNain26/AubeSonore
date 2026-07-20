// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePlayer } from '../../lib/player';
import { Antenna } from './Antenna';

vi.mock('./WaveformCanvas', () => ({
  WaveformCanvas: () => <canvas data-testid="wave" />,
}));

describe('Antenna', () => {
  it('shows the idle invitation and no canvas when not playing', () => {
    usePlayer.setState({ isPlaying: false });
    render(<Antenna />);
    expect(screen.getByText('Appuyez sur lecture pour écouter le direct.')).toBeInTheDocument();
    expect(screen.queryByTestId('wave')).not.toBeInTheDocument();
  });

  it('shows the waveform when playing', () => {
    usePlayer.setState({ isPlaying: true });
    render(<Antenna />);
    expect(screen.getByTestId('wave')).toBeInTheDocument();
  });
});
