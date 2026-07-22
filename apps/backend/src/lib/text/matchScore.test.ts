import { describe, it, expect } from 'bun:test';
import { normalize, similarity, isMatch } from './matchScore';

describe('normalize', () => {
  it('lowercases, strips accents, feat and punctuation', () => {
    expect(normalize("L'Avenir")).toBe('l avenir');
    expect(normalize('Blue Bird (Feat Keren Ilan)')).toBe('blue bird');
    expect(normalize('Kiwi jr.')).toBe('kiwi jr');
  });
});

describe('similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(similarity('goldstar', 'goldstar')).toBe(1);
  });
  it('returns 0 for completely different strings of same length', () => {
    expect(similarity('aaaa', 'zzzz')).toBe(0);
  });
  it('returns a value between 0 and 1 for partial matches', () => {
    const score = similarity('goldstar', 'goldstars');
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThan(1);
  });
});

describe('isMatch', () => {
  it('accepts an exact-ish match', () => {
    expect(
      isMatch(
        { title: 'GOLDSTAR', artist: 'The Sophs' },
        { title: 'GOLDSTAR', artist: 'The Sophs' }
      )
    ).toBe(true);
  });
  it('rejects a wrong song by the right artist (GOLDSTAR vs HOUSE)', () => {
    expect(
      isMatch({ title: 'GOLDSTAR', artist: 'The Sophs' }, { title: 'HOUSE', artist: 'The Sophs' })
    ).toBe(false);
  });
  it('tolerates casing/punctuation drift', () => {
    expect(
      isMatch(
        { title: 'horsepower', artist: 'canaries' },
        { title: 'horsepower', artist: 'Canaries' }
      )
    ).toBe(true);
  });
});
