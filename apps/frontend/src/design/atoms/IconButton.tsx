import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  reveal?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const BASE =
  'size-11 shrink-0 flex items-center justify-center rounded-md transition-opacity duration-150 ease-out-quart hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-80 disabled:pointer-events-none disabled:opacity-50';

const REVEAL =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100';

export function IconButton({
  label,
  active = false,
  reveal = false,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        BASE,
        active ? 'text-accent' : 'text-text-faint hover:text-text',
        reveal && !active ? REVEAL : null,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
