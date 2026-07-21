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

const itemClassName =
  'flex h-11 cursor-default items-center px-4 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface';

export function Menu({ trigger, header, items }: MenuProps) {
  const isRadio = items.some((item) => item.selected !== undefined);
  const selectedValue = items.find((item) => item.selected === true)?.label;
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
            {isRadio ? (
              <BaseMenu.RadioGroup
                value={selectedValue}
                onValueChange={(value) => {
                  items.find((item) => item.label === value)?.onSelect();
                }}
              >
                {items.map((item) => (
                  <BaseMenu.RadioItem
                    key={item.label}
                    value={item.label}
                    disabled={item.disabled}
                    closeOnClick
                    className={cn(
                      itemClassName,
                      'data-[checked]:bg-surface data-[checked]:font-medium'
                    )}
                  >
                    {item.label}
                  </BaseMenu.RadioItem>
                ))}
              </BaseMenu.RadioGroup>
            ) : (
              items.map((item) => (
                <BaseMenu.Item
                  key={item.label}
                  disabled={item.disabled}
                  onClick={item.onSelect}
                  className={itemClassName}
                >
                  {item.label}
                </BaseMenu.Item>
              ))
            )}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
