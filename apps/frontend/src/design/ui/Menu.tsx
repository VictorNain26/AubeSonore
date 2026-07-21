import type { ReactElement, ReactNode } from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cn } from './cn';

interface MenuAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  selected?: boolean;
}

export interface MenuProps {
  trigger: ReactElement;
  header?: ReactNode;
  items: MenuAction[];
}

export function Menu({ trigger, header, items }: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={4}>
          <BaseMenu.Popup className="max-h-72 min-w-44 overflow-y-auto rounded-md border border-border bg-surface-raised py-1 text-body text-text focus:outline-none">
            {header ? (
              <BaseMenu.Group className="border-b border-border px-4 py-2">
                <BaseMenu.GroupLabel>{header}</BaseMenu.GroupLabel>
              </BaseMenu.Group>
            ) : null}
            {items.map((item) => (
              <BaseMenu.Item
                key={item.label}
                disabled={item.disabled}
                onClick={item.onSelect}
                aria-current={item.selected === true ? 'true' : undefined}
                className={cn(
                  'flex h-11 cursor-default items-center px-4 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface',
                  item.selected === true && 'bg-surface font-medium'
                )}
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
