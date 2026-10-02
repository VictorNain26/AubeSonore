import { describe, it, expect } from 'bun:test';
import { buildPlayRow } from './radioPlayService';

describe('buildPlayRow', () => {
  it('normalises the artist for indexed lookup', () => {
    const row = buildPlayRow(1, 'Nosedive', 'Étienne Daho');

    expect(row.artist).toBe('Étienne Daho');
    expect(row.artistNormalized).toBe('etienne daho');
  });

  it('normalises a featuring credit to its primary artist', () => {
    expect(buildPlayRow(2, 'D.A.N.C.E.', 'Justice feat. Uffie').artistNormalized).toBe('justice');
  });

  it('keys artists written in any script', () => {
    expect(buildPlayRow(7, 'Группа крови', 'Кино').artistNormalized).toBe('кино');
    expect(buildPlayRow(8, 'Merry Christmas Mr. Lawrence', '坂本龍一').artistNormalized).toBe(
      '坂本龍一'
    );
  });

  it('carries the AzuraCast song-history id', () => {
    expect(buildPlayRow(42, 'A', 'X').shId).toBe(42);
  });

  it('keeps the raw title and artist untouched for display', () => {
    const row = buildPlayRow(3, '  Around the World  ', 'Daft Punk');

    expect(row.title).toBe('  Around the World  ');
    expect(row.artist).toBe('Daft Punk');
  });

  it('generates a distinct id per play', () => {
    expect(buildPlayRow(4, 'A', 'X').id).not.toBe(buildPlayRow(5, 'A', 'X').id);
  });

  it('yields an empty normalised name for a blank artist', () => {
    expect(buildPlayRow(6, 'A', '   ').artistNormalized).toBe('');
  });
});
