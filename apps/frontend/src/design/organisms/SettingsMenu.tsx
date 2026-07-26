import { Menu as BaseMenu } from '@base-ui/react/menu';
import { Settings } from 'lucide-react';
import { Button } from '../atoms/Button';
import { cn } from '@/lib/utils';
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

const itemClassName =
  'flex h-11 cursor-default items-center px-4 outline-none data-[highlighted]:bg-surface';

const radioItemClassName = cn(
  itemClassName,
  'data-[checked]:bg-surface data-[checked]:font-medium'
);

const groupLabelClassName = 'px-4 pt-2 pb-1 text-caption text-text-muted';

/**
 * Menu unique de réglages : thème, langue, et compte quand l'utilisateur est
 * connecté (en-tête nom/email + déconnexion). Anonyme : déclencheur roue dentée,
 * la visibilité du CTA « Connexion » restant au header.
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
    <BaseMenu.Root>
      <BaseMenu.Trigger
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
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={4}>
          <BaseMenu.Popup className="max-h-72 min-w-44 overflow-y-auto rounded-md border border-border bg-surface-raised py-1 text-body text-text focus:outline-none">
            {user ? (
              <BaseMenu.Group className="border-b border-border px-4 py-2">
                <BaseMenu.GroupLabel className="font-sans">
                  <p className="truncate text-body font-medium">
                    {user.name || m.header_user_fallback()}
                  </p>
                  <p className="truncate text-caption text-text-muted">{user.email}</p>
                </BaseMenu.GroupLabel>
              </BaseMenu.Group>
            ) : null}
            <BaseMenu.Group>
              <BaseMenu.GroupLabel className={groupLabelClassName}>
                {m.settings_theme()}
              </BaseMenu.GroupLabel>
              <BaseMenu.RadioGroup
                value={theme}
                onValueChange={(value) => onThemeChange(value as Theme)}
              >
                <BaseMenu.RadioItem value="light" closeOnClick className={radioItemClassName}>
                  {m.settings_theme_light()}
                </BaseMenu.RadioItem>
                <BaseMenu.RadioItem value="dark" closeOnClick className={radioItemClassName}>
                  {m.settings_theme_dark()}
                </BaseMenu.RadioItem>
              </BaseMenu.RadioGroup>
            </BaseMenu.Group>
            <BaseMenu.Group>
              <BaseMenu.GroupLabel className={groupLabelClassName}>
                {m.settings_language()}
              </BaseMenu.GroupLabel>
              <BaseMenu.RadioGroup
                value={locale}
                onValueChange={(value) => onLocaleChange(value as 'fr' | 'en')}
              >
                <BaseMenu.RadioItem value="fr" closeOnClick className={radioItemClassName}>
                  {m.settings_language_fr()}
                </BaseMenu.RadioItem>
                <BaseMenu.RadioItem value="en" closeOnClick className={radioItemClassName}>
                  {m.settings_language_en()}
                </BaseMenu.RadioItem>
              </BaseMenu.RadioGroup>
            </BaseMenu.Group>
            {user && onSignOut ? (
              <>
                <BaseMenu.Separator className="my-1 border-t border-border" />
                <BaseMenu.Item onClick={onSignOut} className={itemClassName}>
                  {m.header_sign_out()}
                </BaseMenu.Item>
              </>
            ) : null}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
