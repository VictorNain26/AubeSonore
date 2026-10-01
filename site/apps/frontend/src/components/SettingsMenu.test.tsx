// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getLocale, setLocale } from '@/paraglide/runtime.js';
import type * as ParaglideRuntime from '@/paraglide/runtime.js';
import { SettingsMenu } from './SettingsMenu';
import { useLocaleStore } from '../stores/localeStore';
import { THEME_STORAGE_KEY } from '../lib/theme';

// La locale change désormais sans reload (store réactif) : on garde le vrai
// setLocale paraglide et on espionne simplement ses appels.
vi.mock('@/paraglide/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof ParaglideRuntime>();
  return {
    ...actual,
    setLocale: vi.fn(actual.setLocale),
  };
});

const jane = { name: 'Jane', email: 'jane@example.com' };

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  void setLocale('fr', { reload: false });
  useLocaleStore.setState({ locale: 'fr' });
  vi.mocked(setLocale).mockClear();
});

describe('SettingsMenu', () => {
  it('anonyme : roue dentée, thème et langue, sans section compte', async () => {
    render(<SettingsMenu user={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Réglages et compte' }));

    expect(await screen.findByRole('button', { name: /Clair/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sombre/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Français' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.queryByText('Déconnexion')).not.toBeInTheDocument();
  });

  it('connecté : avatar à initiale, nom, email et déconnexion', async () => {
    const onSignOut = vi.fn();
    render(<SettingsMenu user={jane} onSignOut={onSignOut} />);

    const trigger = screen.getByRole('button', { name: 'Réglages et compte' });
    expect(trigger).toHaveTextContent('J');
    await userEvent.click(trigger);

    expect(await screen.findByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Déconnexion/ }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('le segment thème reflète le thème courant et changer persiste le choix', async () => {
    render(<SettingsMenu user={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Réglages et compte' }));
    expect(await screen.findByRole('button', { name: /Clair/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await userEvent.click(screen.getByRole('button', { name: /Sombre/ }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('le segment langue reflète getLocale et changer appelle setLocale', async () => {
    render(<SettingsMenu user={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Réglages et compte' }));
    expect(await screen.findByRole('button', { name: 'Français' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await userEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(setLocale).toHaveBeenCalledWith('en', { reload: false });
    expect(getLocale()).toBe('en');
  });

  it('le changement de langue re-rend l’UI en anglais sans recharger la page', async () => {
    render(<SettingsMenu user={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Réglages et compte' }));
    await userEvent.click(await screen.findByRole('button', { name: 'English' }));

    expect(await screen.findByRole('button', { name: 'Settings and account' })).toBeInTheDocument();
  });
});
