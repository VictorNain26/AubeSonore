import { Popover } from '@base-ui/react/popover';
import { LogOut } from 'lucide-react';
import { Button } from '../design/atoms/Button';
import * as m from '@/paraglide/messages.js';

export interface AccountMenuUser {
  name: string | null;
  email: string;
}

export interface AccountMenuProps {
  user: AccountMenuUser;
  onSignOut: () => void;
}

/** Account menu of a signed-in listener: initial, name, e-mail and sign-out. */
export function AccountMenu({ user, onSignOut }: AccountMenuProps) {
  const initial = (user.name?.charAt(0) || user.email.charAt(0)).toUpperCase();

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button variant="icon" aria-label={m.settings_menu_label()}>
            <span className="border-accent text-caption flex size-9 items-center justify-center rounded-full border font-medium">
              {initial}
            </span>
          </Button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className="border-border bg-surface text-body text-text shadow-lift w-64 rounded-md border p-3 focus:outline-none">
            <div className="border-border flex items-center gap-3 border-b px-1 pt-1 pb-3">
              <span className="bg-surface-raised text-body flex size-9 shrink-0 items-center justify-center rounded-full font-medium">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-body truncate font-medium">
                  {user.name || m.header_user_fallback()}
                </p>
                <p className="text-caption text-text-muted truncate">{user.email}</p>
              </div>
            </div>
            <Popover.Close
              render={
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-body text-text-muted ease-out-quart hover:text-text focus-visible:outline-accent mt-2 flex h-11 w-full items-center gap-2 rounded-sm px-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {m.header_sign_out()}
                </button>
              }
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
