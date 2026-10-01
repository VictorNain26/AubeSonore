import type { ReactNode } from 'react';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { cn } from '@/lib/utils';

export interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<Value extends string> {
  /** Options affichées, dans l'ordre. */
  options: SegmentedControlOption<Value>[];
  /** Valeur actuellement active. */
  value: Value;
  /** Nom accessible du groupe. */
  ariaLabel: string;
  onChange: (value: Value) => void;
}

const optionClass =
  'flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-caption text-text-muted transition-colors duration-150 ease-out-quart hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[pressed]:bg-text data-[pressed]:text-surface data-[pressed]:font-medium data-[pressed]:hover:text-surface';

/**
 * Contrôle segmenté (choix exclusif) basé sur le ToggleGroup de Base UI :
 * état via `data-[pressed]`, navigation clavier flèches incluse.
 */
export function SegmentedControl<Value extends string>({
  options,
  value,
  ariaLabel,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(groupValue) => {
        const next = groupValue[0];
        if (next !== undefined) onChange(next);
      }}
      aria-label={ariaLabel}
      className="bg-surface flex gap-0.5 rounded-full p-0.5"
    >
      {options.map((option) => (
        <Toggle key={option.value} value={option.value} className={cn(optionClass)}>
          {option.icon}
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
