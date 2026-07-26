import { useState } from 'react';
import { setTheme, type Theme } from '../lib/theme';
import { useLocaleStore } from '../stores/localeStore';
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
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <SettingsMenuView
      user={user}
      theme={theme}
      locale={locale}
      onThemeChange={(next) => {
        setTheme(next);
        setLocalTheme(next);
      }}
      onLocaleChange={setLocale}
      onSignOut={onSignOut}
    />
  );
}
