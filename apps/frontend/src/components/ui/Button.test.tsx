// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, IconButton } from './Button';

describe('Button', () => {
  it('renders children and defaults to ghost variant classes', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toHaveClass('text-ink-faint', 'hover:text-ink', 'hover:bg-paper-raised');
  });

  it('applies accent variant classes', () => {
    render(<Button variant="accent">Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveClass('bg-accent', 'text-on-accent', 'hover:opacity-90');
  });

  it('applies ink variant classes', () => {
    render(<Button variant="ink">Ink</Button>);
    const button = screen.getByRole('button', { name: 'Ink' });
    expect(button).toHaveClass('border', 'border-line', 'text-ink-soft');
  });

  it('merges custom className', () => {
    render(<Button className="mt-4">Custom</Button>);
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveClass('mt-4');
  });

  it('forwards native button props', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });
});

describe('IconButton', () => {
  it('uses label as accessible name and title', () => {
    render(<IconButton label="Fermer" />);
    const button = screen.getByRole('button', { name: 'Fermer' });
    expect(button).toHaveAttribute('title', 'Fermer');
  });

  it('defaults to square shape', () => {
    render(<IconButton label="Square" />);
    expect(screen.getByRole('button', { name: 'Square' })).toHaveClass('rounded-md');
  });

  it('applies round shape', () => {
    render(<IconButton label="Round" shape="round" />);
    expect(screen.getByRole('button', { name: 'Round' })).toHaveClass('rounded-full');
  });

  it('applies variant classes', () => {
    render(<IconButton label="Accent" variant="accent" />);
    expect(screen.getByRole('button', { name: 'Accent' })).toHaveClass(
      'bg-accent',
      'text-on-accent'
    );
  });

  it('merges custom className', () => {
    render(<IconButton label="Custom" className="bg-paper/90 border border-line" />);
    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button).toHaveClass('bg-paper/90', 'border-line');
  });
});
