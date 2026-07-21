import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  reveal?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

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
    <Button
      variant="icon"
      type="button"
      aria-label={label}
      className={cn(
        'shrink-0 rounded-md focus-visible:bg-surface-raised',
        active ? 'text-accent' : 'text-text-faint hover:text-text',
        reveal && !active ? REVEAL : null,
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
