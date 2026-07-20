import type { ReactElement } from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';

export interface MenuAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface MenuProps {
  trigger: ReactElement;
  items: MenuAction[];
}

export function Menu({ trigger, items }: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={4}>
          <BaseMenu.Popup className="min-w-44 rounded-md border border-border bg-surface-raised py-1 text-body text-text focus:outline-none">
            {items.map((item) => (
              <BaseMenu.Item
                key={item.label}
                disabled={item.disabled}
                onClick={item.onSelect}
                className="flex h-11 cursor-default items-center px-4 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface"
              >
                {item.label}
              </BaseMenu.Item>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
