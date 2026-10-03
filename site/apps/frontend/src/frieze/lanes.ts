import type { FriezeOverview } from '@aubesonore/shared-types/client';

/** One genre as a lane of the overview: its own baseline, its own scale. */
export interface Lane {
  mbid: string;
  name: string;
  /** Groups present, year by year, from `from` to `to` included; 0 where none. */
  from: number;
  to: number;
  present: number[];
  peak: number;
  peakYear: number;
  total: number;
  /** The year the genre's mass is centred on: what the lanes are ordered by. */
  center: number;
}

/**
 * Near the present the density is a lower bound, not a trend: recent groups
 * are less tagged, and the total falls 89 % between 2014 and 2026, almost
 * entirely by artefact (musilogy README, "Limites assumées").
 */
export const INCOMPLETE_FROM = 2015;

export function buildLanes(overview: FriezeOverview): Lane[] {
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
    let peak = 0;
    let peakYear = from;
    let total = 0;
    let weighted = 0;
    present.forEach((value, i) => {
      total += value;
      weighted += value * (from + i);
      if (value > peak) {
        peak = value;
        peakYear = from + i;
      }
    });
    lanes.push({
      mbid: genre.mbid,
      name: genre.name,
      from,
      to,
      present,
      peak,
      peakYear,
      total,
      center: total > 0 ? weighted / total : from,
    });
  }
  return lanes;
}

/**
 * The `count` heaviest genres, ordered by the year their mass is centred on,
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
 * `height` above the lane's baseline at its peak, so every lane shows the
 * shape of its own life, whatever its size.
 */
export function laneOutline(lane: Lane, baseline: number, height: number): [number, number][] {
  const points: [number, number][] = [[lane.from, baseline]];
  lane.present.forEach((value, i) => {
    points.push([lane.from + i + 0.5, baseline - (height * value) / (lane.peak || 1)]);
  });
  points.push([lane.to + 1, baseline]);
  return points;
}
