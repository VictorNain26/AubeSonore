// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrackActionsView } from './TrackActions';

describe('TrackActionsView', () => {
  it('renders share + like, reflecting liked state', () => {
    render(
      <TrackActionsView isLiked isLiking={false} onToggleLike={() => {}} onShare={() => {}} />
    );
    expect(screen.getByLabelText('Partager ce morceau')).toBeInTheDocument();
    const like = screen.getByLabelText('Retirer de ma bibliothèque');
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like.className).toContain('text-accent');
  });
});
