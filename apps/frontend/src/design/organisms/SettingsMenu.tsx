import { Popover } from '@base-ui/react/popover';
import { Globe, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { Button } from '../atoms/Button';
import { SegmentedControl } from '../molecules/SegmentedControl';
import type { Theme } from '../../lib/theme';
import * as m from '@/paraglide/messages.js';

export interface SettingsMenuUser {
  name: string | null;
  email: string;
}

export interface SettingsMenuViewProps {
  /** Utilisateur connecté ; `null` rend la variante anonyme (roue dentée, sans compte). */
  user: SettingsMenuUser | null;
  theme: Theme;
  locale: 'fr' | 'en';
  onThemeChange: (theme: Theme) => void;
  onLocaleChange: (locale: 'fr' | 'en') => void;
  onSignOut?: (() => void) | undefined;
}

/**
 * Panneau unique de réglages : thème et langue en contrôles segmentés, et
 * compte quand l'utilisateur est connecté (en-tête nom/email + déconnexion).
 * Anonyme : déclencheur roue dentée, le CTA « Connexion » reste au header.
 */
export function SettingsMenuView({
  user,
  theme,
  locale,
  onThemeChange,
  onLocaleChange,
  onSignOut,
}: SettingsMenuViewProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button variant="icon" aria-label={m.settings_menu_label()}>
            {user ? (
              <span className="flex size-7 items-center justify-center rounded-full bg-surface-raised text-caption font-medium">
                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Settings className="size-5" />
            )}
          </Button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className="w-64 rounded-lg border border-border bg-surface-raised p-3 text-body text-text shadow-lg focus:outline-none">
            {user ? (
              <div className="flex items-center gap-3 border-b border-border px-1 pt-1 pb-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-body font-medium">
                  {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 font-sans">
                  <p className="truncate text-body font-medium">
                    {user.name || m.header_user_fallback()}
                  </p>
                  <p className="truncate text-caption text-text-muted">{user.email}</p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-3">
              <div className="flex flex-col gap-1.5">
                <p className="px-1 text-caption text-text-muted">{m.settings_theme()}</p>
                <SegmentedControl
                  ariaLabel={m.settings_theme()}
                  value={theme}
                  onChange={onThemeChange}
                  options={[
                    {
                      value: 'light',
                      label: m.settings_theme_light(),
                      icon: <Sun className="size-3.5" />,
                    },
                    {
                      value: 'dark',
                      label: m.settings_theme_dark(),
                      icon: <Moon className="size-3.5" />,
                    },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="flex items-center gap-1.5 px-1 text-caption text-text-muted">
                  <Globe className="size-3.5" />
                  {m.settings_language()}
                </p>
                <SegmentedControl
                  ariaLabel={m.settings_language()}
                  value={locale}
                  onChange={onLocaleChange}
                  options={[
                    { value: 'fr', label: m.settings_language_fr() },
                    { value: 'en', label: m.settings_language_en() },
                  ]}
                />
              </div>
            </div>

            {user && onSignOut ? (
              <Popover.Close
                render={
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="mt-3 flex h-11 w-full cursor-pointer items-center gap-2 rounded-md border-t border-border px-3 pt-2 text-body text-text-muted transition-colors duration-150 ease-out-quart hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <LogOut className="size-4" />
                    {m.header_sign_out()}
                  </button>
                }
              />
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
