import { getMoment } from './moments';
import type { SongEntry } from './azuracast';
import type { Moment } from './moments';

export interface MomentGroup {
  moment: Moment;
  entries: SongEntry[];
}

export function groupByMoment(entries: SongEntry[]): MomentGroup[] {
  const groups: MomentGroup[] = [];
  for (const e of entries) {
    const moment = getMoment(new Date(e.played_at * 1000));
    const last = groups[groups.length - 1];
    if (last && last.moment === moment) last.entries.push(e);
    else groups.push({ moment, entries: [e] });
  }
  return groups;
}

export function dedupeBySongId(entries: SongEntry[]): SongEntry[] {
  const seen = new Set<number>();
  return entries.filter((e) => (seen.has(e.sh_id) ? false : (seen.add(e.sh_id), true)));
}
