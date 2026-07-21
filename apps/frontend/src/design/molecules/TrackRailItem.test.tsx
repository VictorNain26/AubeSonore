// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrackRailItem } from './TrackRailItem';

const base = {
  title: 'Titre',
  artist: 'Artiste',
  isLiked: false,
  isLiking: false,
  onToggle: () => {},
  onShare: () => {},
};

describe('TrackRailItem', () => {
  it('renders title and artist', () => {
    render(<TrackRailItem {...base} />);
    expect(screen.getByText('Titre')).toBeInTheDocument();
    expect(screen.getByText('Artiste')).toBeInTheDocument();
  });

  it('calls onToggle and onShare on the action buttons', () => {
    const onToggle = vi.fn();
    const onShare = vi.fn();
    render(<TrackRailItem {...base} onToggle={onToggle} onShare={onShare} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes morceaux' }));
    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('shows the remove label when liked', () => {
    render(<TrackRailItem {...base} isLiked />);
    expect(screen.getByRole('button', { name: 'Retirer de mes morceaux' })).toBeInTheDocument();
  });

  it('disables the like button while liking', () => {
    render(<TrackRailItem {...base} isLiking />);
    expect(screen.getByRole('button', { name: 'Ajouter à mes morceaux' })).toBeDisabled();
  });
});
