// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalShell } from './ModalShell';

describe('ModalShell', () => {
  it('renders title, description and children open', () => {
    render(
      <ModalShell isOpen title="Test Title" description="Test Description" onClose={vi.fn()}>
        <div>Test Children</div>
      </ModalShell>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Children')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(
      <ModalShell isOpen={false} title="Test Title" onClose={vi.fn()}>
        <div>Test Children</div>
      </ModalShell>
    );
    expect(screen.queryByText('Test Children')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <ModalShell isOpen title="Test Title" onClose={onClose}>
        <div>Test Children</div>
      </ModalShell>
    );
    const closeButton = screen.getByLabelText('Fermer');
    await userEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('applies custom maxWidthClassName', () => {
    render(
      <ModalShell isOpen title="Test Title" onClose={vi.fn()} maxWidthClassName="max-w-lg">
        <div>Test Children</div>
      </ModalShell>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('max-w-lg');
  });

  it('renders sr-only description when description is not provided', () => {
    render(
      <ModalShell isOpen title="Test Title" onClose={vi.fn()}>
        <div>Test Children</div>
      </ModalShell>
    );
    const srOnlyDescription = screen.getByText('Test Title', { selector: '.sr-only' });
    expect(srOnlyDescription).toBeInTheDocument();
  });
});
