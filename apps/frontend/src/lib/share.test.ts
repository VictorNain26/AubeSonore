import { describe, it, expect } from 'vitest';
import { getPlatformLink, getTrackShareUrl } from '@aubesonore/core/share';

describe('getPlatformLink', () => {
  it('returns the preferred platform link when available', () => {
    expect(
      getPlatformLink(
        {
          title: 'a',
          artist: 'b',
          platformLinks: { spotify: 'https://s/1', deezer: 'https://d/1' },
        },
        'spotify'
      )
    ).toBe('https://s/1');
  });

  it('maps a youtube preference to the youtubeMusic link', () => {
    expect(
      getPlatformLink(
        { title: 'a', artist: 'b', platformLinks: { youtubeMusic: 'https://ym/1' } },
        'youtube'
      )
    ).toBe('https://ym/1');
  });

  it('falls back to any real platform link when the preferred one is missing', () => {
    expect(
      getPlatformLink(
        { title: 'a', artist: 'b', platformLinks: { deezer: 'https://d/1' } },
        'spotify'
      )
    ).toBe('https://d/1');
  });

  it('returns null when no real platform link exists (never a search URL)', () => {
    expect(getPlatformLink({ title: 'a', artist: 'b', platformLinks: null }, 'spotify')).toBeNull();
    expect(getPlatformLink({ title: 'a', artist: 'b' }, 'spotify')).toBeNull();
  });
});

describe('getTrackShareUrl', () => {
  it('prefers the preferred platform link', () => {
    expect(
      getTrackShareUrl(
        { title: 'a', artist: 'b', platformLinks: { spotify: 'https://s/1' } },
        'spotify'
      )
    ).toBe('https://s/1');
  });

  it('falls back to a YouTube search as a last resort for an unresolved track', () => {
    expect(getTrackShareUrl({ title: 'Song', artist: 'Artist' })).toContain('youtube.com/results');
  });
});
