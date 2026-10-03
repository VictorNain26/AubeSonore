import { describe, expect, it } from 'vitest';
import type { FriezeOverview } from '@aubesonore/shared-types/client';
import { buildLanes, heaviestByEpoch, laneOutline } from './lanes';

const overview: FriezeOverview = {
  genres: [
    { mbid: 'g-jazz', name: 'jazz', artists: 10 },
    { mbid: 'g-rock', name: 'rock', artists: 50 },
    { mbid: 'g-punk', name: 'punk', artists: 20 },
  ],
  density: {
    genre: [1, 1, 1, 0, 0, 2, 2],
    year: [1960, 1961, 1963, 1920, 1921, 1977, 1978],
    present: [10, 30, 20, 4, 2, 15, 5],
  },
};

describe('buildLanes', () => {
  it('fills the years a genre has no group with zero, rather than skipping them', () => {
    const rock = buildLanes(overview).find((l) => l.name === 'rock');

    expect(rock).toMatchObject({ from: 1960, to: 1963, present: [10, 30, 0, 20] });
  });

  it('keeps each genre peak and the year its mass is centred on', () => {
    const rock = buildLanes(overview).find((l) => l.name === 'rock');

    expect(rock).toMatchObject({ peak: 30, peakYear: 1961, total: 60 });
    expect(rock?.center).toBeCloseTo((1960 * 10 + 1961 * 30 + 1963 * 20) / 60);
  });
});

describe('heaviestByEpoch', () => {
  it('keeps the heaviest genres, then orders them by epoch', () => {
    const lanes = heaviestByEpoch(buildLanes(overview), 2);

    expect(lanes.map((l) => l.name)).toEqual(['rock', 'punk']);
  });

  it('reads top to bottom as history goes', () => {
    expect(heaviestByEpoch(buildLanes(overview), 3).map((l) => l.name)).toEqual([
      'jazz',
      'rock',
      'punk',
    ]);
  });
});

describe('laneOutline', () => {
  it('rises to the full height at the peak and closes on the baseline', () => {
    const rock = buildLanes(overview).find((l) => l.name === 'rock');
    if (!rock) throw new Error('rock lane missing');

    const outline = laneOutline(rock, 100, 40);

    expect(outline[0]).toEqual([1960, 100]);
    expect(outline[2]).toEqual([1961.5, 60]);
    expect(outline.at(-1)).toEqual([1964, 100]);
  });
});
