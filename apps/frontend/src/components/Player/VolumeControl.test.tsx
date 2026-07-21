// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VolumeControl } from './VolumeControl';

describe('VolumeControl', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn() })
    );
  });

  it('toggles mute from the icon button on desktop', () => {
    const onToggleMute = vi.fn();
    render(
      <VolumeControl
        volume={0.5}
        isMuted={false}
        onVolumeChange={vi.fn()}
        onToggleMute={onToggleMute}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Volume — couper le son' }));
    expect(onToggleMute).toHaveBeenCalledOnce();
  });

  it('shows the slider at zero when muted', () => {
    render(<VolumeControl volume={0.5} isMuted onVolumeChange={vi.fn()} onToggleMute={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Volume — rétablir le son' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('forwards slider keyboard changes to onVolumeChange', () => {
    const onVolumeChange = vi.fn();
    render(
      <VolumeControl
        volume={0.5}
        isMuted={false}
        onVolumeChange={onVolumeChange}
        onToggleMute={vi.fn()}
      />
    );
    const slider = screen.getByRole('slider', { name: 'Volume' });
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onVolumeChange).toHaveBeenCalledWith(0.55);
  });
});
