import type { FriezeOverview } from '@aubesonore/shared-types/client';

/** One genre as a lane of the overview: its own baseline, its own scale. */
export interface Lane {
  mbid: string;
  name: string;
  /** Years covered, from `from` to `to` included. */
  from: number;
  to: number;
  /** Groups of the genre present each year; 0 where none. */
  present: number[];
  /**
   * The genre's share of the groups present each year. Absolute counts would
   * only show MusicBrainz's growth.
   */
  share: number[];
  /**
   * What the ridge draws: the lower bound of the share's Wilson interval. A
   * share over a handful of groups (1 group present in 1860, 30 in 1920) is
   * noise; the bound keeps every year and lets the sample size speak.
   */
  sure: number[];
  peakSure: number;
  /** The year the bound peaks, and the share observed that year. */
  peakYear: number;
  peakShare: number;
  /** Groups summed over the years: the weight that picks which lanes show. */
  total: number;
  /** The year the genre's bounded share is centred on: what lanes are ordered by. */
  center: number;
}

/**
 * Near the present the density is a lower bound, not a trend: recent groups
 * are less tagged, and the total falls 89 % between 2014 and 2026, almost
 * entirely by artefact (musilogy README, "Limites assumées").
 */
export const INCOMPLETE_FROM = 2015;

const Z = 1.96;

/**
 * Lower bound of the 95 % Wilson score interval for k successes in n trials,
 * the bound the pipeline already judges its sources by.
 * https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval
 */
export function wilsonLower(k: number, n: number): number {
  if (n === 0) return 0;
  const p = k / n;
  const z2 = Z * Z;
  const bound =
    (p + z2 / (2 * n) - Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  // Zero successes give 0 exactly in theory, -2e-17 in floating point.
  return Math.max(0, bound);
}

export function buildLanes(overview: FriezeOverview): Lane[] {
  const active = new Map(
    overview.activity.year.map((y, i) => [y, overview.activity.groups[i] ?? 0])
  );
  const byGenre = new Map<number, Map<number, number>>();
  overview.density.genre.forEach((g, i) => {
    const years = byGenre.get(g) ?? new Map<number, number>();
    years.set(overview.density.year[i] ?? 0, overview.density.present[i] ?? 0);
    byGenre.set(g, years);
  });

  const lanes: Lane[] = [];
  for (const [g, years] of byGenre) {
    const genre = overview.genres[g];
    if (!genre) continue;
    const from = Math.min(...years.keys());
    const to = Math.max(...years.keys());
    const present = Array.from({ length: to - from + 1 }, (_, i) => years.get(from + i) ?? 0);
    // activity counts every group density does: a year with groups has a denominator.
    const groups = present.map((value, i) => active.get(from + i) ?? value);
    const share = present.map((value, i) => (value > 0 ? value / (groups[i] ?? value) : 0));
    const sure = present.map((value, i) => wilsonLower(value, groups[i] ?? 0));
    let peakSure = 0;
    let peakYear = from;
    let mass = 0;
    let weighted = 0;
    sure.forEach((value, i) => {
      mass += value;
      weighted += value * (from + i);
      if (value > peakSure) {
        peakSure = value;
        peakYear = from + i;
      }
    });
    lanes.push({
      mbid: genre.mbid,
      name: genre.name,
      from,
      to,
      present,
      share,
      sure,
      peakSure,
      peakYear,
      peakShare: share[peakYear - from] ?? 0,
      total: present.reduce((sum, value) => sum + value, 0),
      center: mass > 0 ? weighted / mass : from,
    });
  }
  return lanes;
}

/**
 * The `count` heaviest genres, ordered by the year their share is centred on,
 * then by MBID: read top to bottom, the lanes tell the history in order.
 */
export function heaviestByEpoch(lanes: Lane[], count: number): Lane[] {
  return [...lanes]
    .sort((a, b) => b.total - a.total || a.mbid.localeCompare(b.mbid))
    .slice(0, count)
    .sort((a, b) => a.center - b.center || a.mbid.localeCompare(b.mbid));
}

/**
 * The lane's outline in world units: x in years, y downwards from the top of
 * the frieze. Each year spans [year, year + 1]; the ridge rises up to
 * `height` above the lane's baseline where the bounded share peaks, so every
 * lane shows the shape of its own life, whatever its size.
 */
export function laneOutline(lane: Lane, baseline: number, height: number): [number, number][] {
  const points: [number, number][] = [[lane.from, baseline]];
  lane.sure.forEach((value, i) => {
    points.push([lane.from + i + 0.5, baseline - (height * value) / (lane.peakSure || 1)]);
  });
  points.push([lane.to + 1, baseline]);
  return points;
}
