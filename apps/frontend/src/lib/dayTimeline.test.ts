import { describe, it, expect } from 'vitest';
import { groupByMoment, dedupeBySongId } from './dayTimeline';
import type { SongEntry } from '../lib/azuracast';

const entry = (sh_id: number, h: number): SongEntry => ({
  sh_id,
  played_at: new Date(2026, 6, 13, h).getTime() / 1000,
  duration: 200,
  playlist: '',
  streamer: '',
  is_request: false,
  song: {
    id: String(sh_id),
    art: '',
    text: '',
    artist: 'A',
    title: `T${sh_id}`,
    album: '',
    genre: '',
    isrc: '',
    lyrics: '',
  },
});

describe('groupByMoment', () => {
  it('groups newest-first by moment, omitting empty moments', () => {
    const groups = groupByMoment([entry(3, 18), entry(2, 10), entry(1, 6)]);
    expect(groups.map((g) => g.moment)).toEqual(['dusk', 'day', 'dawn']);
    expect(groups[0]!.entries[0]!.sh_id).toBe(3);
  });
  it('keeps consecutive same-moment entries in one group', () => {
    const groups = groupByMoment([entry(2, 11), entry(1, 10)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.entries.map((e) => e.sh_id)).toEqual([2, 1]);
  });
});

describe('dedupeBySongId', () => {
  it('drops later duplicates of the same sh_id', () => {
    expect(dedupeBySongId([entry(1, 10), entry(1, 10), entry(2, 9)]).map((e) => e.sh_id)).toEqual([
      1, 2,
    ]);
  });
});
