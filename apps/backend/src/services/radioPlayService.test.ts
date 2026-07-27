import { describe, it, expect } from 'bun:test';
import { buildPlayRow } from './radioPlayService';

describe('buildPlayRow', () => {
  it('normalises the artist for indexed lookup', () => {
    const row = buildPlayRow('Nosedive', 'Étienne Daho');

    expect(row.artist).toBe('Étienne Daho');
    expect(row.artistNormalized).toBe('etienne daho');
  });

  it('normalises a featuring credit to its primary artist', () => {
    expect(buildPlayRow('D.A.N.C.E.', 'Justice feat. Uffie').artistNormalized).toBe('justice');
  });

  it('keeps the raw title and artist untouched for display', () => {
    const row = buildPlayRow('  Around the World  ', 'Daft Punk');

    expect(row.title).toBe('  Around the World  ');
    expect(row.artist).toBe('Daft Punk');
  });

  it('generates a distinct id per play', () => {
    expect(buildPlayRow('A', 'X').id).not.toBe(buildPlayRow('A', 'X').id);
  });

  it('yields an empty normalised name for a blank artist', () => {
    expect(buildPlayRow('A', '   ').artistNormalized).toBe('');
  });
});
