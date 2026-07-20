// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useNowPlayingStore } from '../../lib/azuracast';
import { AntennaStatus } from './AntennaStatus';

const base = {
  now_playing: { sh_id: 1, played_at: 0, song: { title: 'T', artist: 'A', art: '' } },
  listeners: { current: 12 },
  live: { is_live: false, streamer_name: '', broadcast_start: null },
};

describe('AntennaStatus', () => {
  beforeEach(() => {
    useNowPlayingStore.setState({ data: structuredClone(base) as never });
  });

  it('always shows the live line, even without a DJ', () => {
    render(<AntennaStatus />);
    expect(screen.getByText('En direct')).toBeInTheDocument();
  });

  it('never shows the listener count', () => {
    render(<AntennaStatus />);
    expect(screen.queryByText(/à l'écoute/)).not.toBeInTheDocument();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });

  it('shows DJ name when live', () => {
    useNowPlayingStore.setState({
      data: {
        ...structuredClone(base),
        live: { is_live: true, streamer_name: 'DJ X', broadcast_start: null },
      } as never,
    });
    render(<AntennaStatus />);
    expect(screen.getByText(/DJ X/)).toBeInTheDocument();
  });
});
