// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutModal } from './AboutModal';

describe('AboutModal', () => {
  it('renders the title when open', () => {
    render(<AboutModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText('AubeSonore')).toBeInTheDocument();
    expect(screen.getByText('contact@aubesonore.fr')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<AboutModal isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByText('contact@aubesonore.fr')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<AboutModal isOpen onClose={onClose} />);

    await userEvent.click(screen.getByLabelText('Fermer'));

    expect(onClose).toHaveBeenCalled();
  });
});
