import { useState } from 'react';
import { setTheme, type Theme } from '../lib/theme';
import { getLocale, setLocale } from '@/paraglide/runtime.js';
import { SettingsMenuView, type SettingsMenuUser } from '../design/organisms/SettingsMenu';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export interface SettingsMenuProps {
  user: SettingsMenuUser | null;
  onSignOut?: () => void;
}

export function SettingsMenu({ user, onSignOut }: SettingsMenuProps) {
  const [theme, setLocalTheme] = useState<Theme>(currentTheme);

  return (
    <SettingsMenuView
      user={user}
      theme={theme}
      locale={getLocale()}
      onThemeChange={(next) => {
        setTheme(next);
        setLocalTheme(next);
      }}
      onLocaleChange={(next) => void setLocale(next)}
      onSignOut={onSignOut}
    />
  );
}
