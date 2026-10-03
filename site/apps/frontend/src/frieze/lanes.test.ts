import { describe, expect, it } from 'vitest';
import type { FriezeOverview } from '@aubesonore/shared-types/client';
import { buildLanes, heaviestByEpoch, laneOutline, wilsonLower } from './lanes';

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
  activity: {
    year: [1920, 1921, 1960, 1961, 1963, 1977, 1978],
    groups: [8, 8, 40, 60, 80, 30, 50],
  },
};

describe('buildLanes', () => {
  it('fills the years a genre has no group with zero, rather than skipping them', () => {
    const rock = buildLanes(overview).find((l) => l.name === 'rock');

    expect(rock).toMatchObject({ from: 1960, to: 1963, present: [10, 30, 0, 20] });
  });

  it('reads each year as the share of the groups present', () => {
    const rock = buildLanes(overview).find((l) => l.name === 'rock');

    expect(rock?.share).toEqual([0.25, 0.5, 0, 0.25]);
    expect(rock).toMatchObject({ peakYear: 1961, peakShare: 0.5, total: 60 });
  });

  it('peaks where the share is surely high, not on a year of a handful of groups', () => {
    const lanes = buildLanes({
      genres: [{ mbid: 'g-blues', name: 'blues', artists: 41 }],
      density: { genre: [0, 0], year: [1900, 1960], present: [1, 40] },
      activity: { year: [1900, 1960], groups: [1, 100] },
    });

    // 1 group of 1 is 100 %, 40 of 100 is 40 %: the second is the one to trust.
    expect(lanes[0]).toMatchObject({ peakYear: 1960, peakShare: 0.4 });
  });
});

describe('wilsonLower', () => {
  it('gives the 95 % Wilson lower bound', () => {
    expect(wilsonLower(0, 10)).toBe(0);
    expect(wilsonLower(1, 1)).toBeCloseTo(1 / (1 + 1.96 * 1.96), 6);
    expect(wilsonLower(50, 100)).toBeCloseTo(0.4038, 3);
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
  it('rises to the full height where the bound peaks and closes on the baseline', () => {
    const rock = buildLanes(overview).find((l) => l.name === 'rock');
    if (!rock) throw new Error('rock lane missing');

    const outline = laneOutline(rock, 100, 40);

    expect(outline[0]).toEqual([1960, 100]);
    expect(outline[2]).toEqual([1961.5, 60]);
    expect(outline.at(-1)).toEqual([1964, 100]);
  });
});
