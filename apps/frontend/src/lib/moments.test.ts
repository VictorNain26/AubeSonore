import { describe, it, expect } from 'vitest';
import { getMoment, nextBoundary, MOMENT_LABELS } from './moments';

const at = (h: number, m = 0) => new Date(2026, 6, 13, h, m);

describe('getMoment', () => {
  it.each([
    [5, 'dawn'],
    [8, 'dawn'],
    [9, 'day'],
    [16, 'day'],
    [17, 'dusk'],
    [21, 'dusk'],
    [22, 'night'],
    [0, 'night'],
    [4, 'night'],
  ] as const)('%ih → %s', (h, expected) => {
    expect(getMoment(at(h))).toBe(expected);
  });
});

describe('nextBoundary', () => {
  it('within a moment → its end', () => {
    expect(nextBoundary(at(10)).getHours()).toBe(17);
  });
  it('night before midnight → 5h next day', () => {
    const b = nextBoundary(at(23));
    expect(b.getHours()).toBe(5);
    expect(b.getDate()).toBe(14);
  });
  it('night after midnight → 5h same day', () => {
    const b = nextBoundary(at(2));
    expect(b.getHours()).toBe(5);
    expect(b.getDate()).toBe(13);
  });
});

it('labels are the French UI copy', () => {
  expect(MOMENT_LABELS).toEqual({ dawn: 'Aube', day: 'Jour', dusk: 'Crépuscule', night: 'Nuit' });
});
