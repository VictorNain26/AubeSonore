import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    expect(cn('text-sm', 'text-xl')).toBe('text-xl');
  });

  it('keeps non-conflicting tailwind utilities', () => {
    expect(cn('p-2 m-2')).toBe('p-2 m-2');
  });
});
