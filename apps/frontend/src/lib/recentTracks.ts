import type { SongEntry } from './azuracast';

export function takeRecent(entries: SongEntry[], n: number): SongEntry[] {
  const seen = new Set<number>();
  const unique = entries.filter((e) => {
    if (seen.has(e.sh_id)) return false;
    seen.add(e.sh_id);
    return true;
  });
  return unique.sort((a, b) => b.played_at - a.played_at).slice(0, n);
}
