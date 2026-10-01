import { useLocaleStore } from '../stores/localeStore';
import { SettingsMenuView, type SettingsMenuUser } from '../design/organisms/SettingsMenu';

export interface SettingsMenuProps {
  user: SettingsMenuUser | null;
  onSignOut?: () => void;
}

export function SettingsMenu({ user, onSignOut }: SettingsMenuProps) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <SettingsMenuView
      user={user}
      locale={locale}
      onLocaleChange={setLocale}
      onSignOut={onSignOut}
    />
  );
}
