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

describe('applyTheme meta theme-color sync', () => {
  it('synchronise la meta theme-color sur --surface au changement de thème', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#000000');
    document.head.appendChild(meta);
    const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => ' oklch(0.19 0.025 265) ',
    } as unknown as CSSStyleDeclaration);

    applyTheme('dark');

    expect(meta.getAttribute('content')).toBe('oklch(0.19 0.025 265)');
    spy.mockRestore();
    meta.remove();
  });

  it('laisse la meta theme-color intacte quand --surface est vide (jsdom sans CSS)', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#000000');
    document.head.appendChild(meta);

    applyTheme('light');

    expect(meta.getAttribute('content')).toBe('#000000');
    meta.remove();
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
