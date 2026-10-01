// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { getLocale } from '@/paraglide/runtime.js';
import { readLocaleChoice, useLocaleStore } from './localeStore';

afterEach(() => {
  useLocaleStore.getState().setLocale('fr');
});

describe('localeStore', () => {
  it('moves to /en/ and back to / without reloading', () => {
    window.history.replaceState(null, '', '/?x=1');

    useLocaleStore.getState().setLocale('en');
    expect(window.location.pathname).toBe('/en/');
    expect(window.location.search).toBe('?x=1');
    expect(getLocale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(readLocaleChoice()).toBe('en');

    useLocaleStore.getState().setLocale('fr');
    expect(window.location.pathname).toBe('/');
    expect(getLocale()).toBe('fr');
  });
});
