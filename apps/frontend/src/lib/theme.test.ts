// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { THEME_STORAGE_KEY, applyTheme, initTheme, resolveTheme, setTheme } from './theme';

const mockMatchMedia = (matches: boolean) => {
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  });
  return { fire: (m: boolean) => listeners.forEach((cb) => cb({ matches: m })) };
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('resolveTheme', () => {
  it('uses the stored choice when valid', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('falls back to system preference', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('junk', false)).toBe('light');
  });
});

describe('applyTheme', () => {
  it('sets data-theme for dark and removes it for light', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('initTheme', () => {
  it('applies the system preference when nothing is stored', () => {
    mockMatchMedia(true);
    expect(initTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
  it('follows live system changes only without a stored choice', () => {
    const media = mockMatchMedia(false);
    initTheme();
    media.fire(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    setTheme('light');
    media.fire(true);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('setTheme', () => {
  it('persists and applies', () => {
    mockMatchMedia(false);
    setTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
