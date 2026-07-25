// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlayer } from '../../lib/player';
import { useNowPlayingStore } from '../../lib/azuracast';
import { Antenna } from './Antenna';

vi.mock('./WaveformCanvas', () => ({
  WaveformCanvas: () => <canvas data-testid="wave" />,
}));

describe('Antenna', () => {
  beforeEach(() => {
    useNowPlayingStore.setState({ data: null });
  });

  it('renders the resting wave without any prompt when not playing', () => {
    usePlayer.setState({ isPlaying: false });
    render(<Antenna />);
    expect(screen.getByTestId('wave')).toBeInTheDocument();
    expect(screen.queryByText(/Appuyez sur lecture/)).not.toBeInTheDocument();
  });

  it('shows the waveform when playing', () => {
    usePlayer.setState({ isPlaying: true });
    render(<Antenna />);
    expect(screen.getByTestId('wave')).toBeInTheDocument();
  });

  it('replaces the wave with the off-air message when the stream is offline', () => {
    useNowPlayingStore.setState({ data: { is_online: false } as never });
    usePlayer.setState({ isPlaying: false });
    render(<Antenna />);
    expect(screen.queryByTestId('wave')).not.toBeInTheDocument();
    expect(screen.getByText(/Hors antenne/)).toBeInTheDocument();
  });

  it('shows the live listener count next to the waveform', () => {
    useNowPlayingStore.setState({
      data: { is_online: true, listeners: { unique: 37 } } as never,
    });
    usePlayer.setState({ isPlaying: true });
    render(<Antenna />);
    expect(screen.getByText('37 auditeurs en ce moment')).toBeInTheDocument();
  });

  it('uses the singular for a single listener', () => {
    useNowPlayingStore.setState({
      data: { is_online: true, listeners: { unique: 1 } } as never,
    });
    usePlayer.setState({ isPlaying: true });
    render(<Antenna />);
    expect(screen.getByText('1 auditeur en ce moment')).toBeInTheDocument();
  });

  it('hides the count while the first payload has not arrived', () => {
    usePlayer.setState({ isPlaying: true });
    render(<Antenna />);
    expect(screen.queryByText(/auditeur/)).not.toBeInTheDocument();
  });

  it('hides the count when off-air', () => {
    useNowPlayingStore.setState({
      data: { is_online: false, listeners: { unique: 37 } } as never,
    });
    render(<Antenna />);
    expect(screen.queryByText(/auditeur/)).not.toBeInTheDocument();
  });
});
