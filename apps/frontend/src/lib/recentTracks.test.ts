import { describe, it, expect } from 'vitest';
import { takeRecent } from './recentTracks';
import type { SongEntry } from './azuracast';

const entry = (sh_id: number, played_at: number): SongEntry => ({
  sh_id,
  played_at,
  duration: 200,
  playlist: '',
  streamer: '',
  is_request: false,
  song: {
    id: String(sh_id),
    art: '',
    text: '',
    artist: 'a',
    title: `t${sh_id}`,
    album: '',
    genre: '',
    isrc: '',
    lyrics: '',
  },
});

describe('takeRecent', () => {
  it('sorts newest first and truncates', () => {
    const out = takeRecent([entry(1, 100), entry(2, 300), entry(3, 200)], 2);
    expect(out.map((e) => e.sh_id)).toEqual([2, 3]);
  });

  it('dedupes by sh_id keeping first occurrence', () => {
    const out = takeRecent([entry(1, 300), entry(1, 300), entry(2, 100)], 8);
    expect(out).toHaveLength(2);
  });

  it('returns empty for empty input', () => {
    expect(takeRecent([], 8)).toEqual([]);
  });
});
