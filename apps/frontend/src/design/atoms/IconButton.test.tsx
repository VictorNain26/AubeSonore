// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Heart } from 'lucide-react';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('exposes its label as the accessible name and fires onClick', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Partager" onClick={onClick}>
        <Heart />
      </IconButton>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire when disabled', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Aimer" disabled onClick={onClick}>
        <Heart />
      </IconButton>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aimer' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
