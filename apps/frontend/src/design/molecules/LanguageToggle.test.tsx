// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getLocale, setLocale } from '@/paraglide/runtime.js';
import * as m from '@/paraglide/messages.js';
import { LanguageToggle } from './LanguageToggle';

describe('LanguageToggle', () => {
  afterEach(() => {
    void setLocale('fr', { reload: false });
  });

  it('propose l’anglais quand la locale est le français', () => {
    void setLocale('fr', { reload: false });
    render(<LanguageToggle />);
    expect(
      screen.getByRole('button', { name: 'Changer de langue / Switch language' })
    ).toHaveTextContent('EN');
  });

  it('après setLocale en anglais, les messages passent en anglais', () => {
    void setLocale('en', { reload: false });
    render(<LanguageToggle />);
    expect(getLocale()).toBe('en');
    expect(screen.getByRole('button')).toHaveTextContent('FR');
    expect(m.trends_modal_title()).toBe('Trends');
    expect(m.toast_link_copied()).toBe('Link copied');
  });
});
