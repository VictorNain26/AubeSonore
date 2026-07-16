import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'accent' | 'ink' | 'ghost';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  accent: 'bg-accent text-on-accent hover:opacity-90',
  ink: 'border border-line text-ink-soft hover:text-ink hover:bg-paper-raised',
  ghost: 'text-ink-faint hover:text-ink hover:bg-paper-raised',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 cursor-pointer transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'ghost', className, ...props }: ButtonProps): ReactElement {
  return (
    <button
      className={cn(
        BASE_CLASSES,
        'rounded-md px-3 py-1.5 text-body',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}

export interface IconButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  shape?: 'round' | 'square';
  label: string;
}

export function IconButton({
  variant = 'ghost',
  shape = 'square',
  label,
  className,
  ...props
}: IconButtonProps): ReactElement {
  return (
    <button
      className={cn(
        BASE_CLASSES,
        'p-2 [&_svg]:w-5 [&_svg]:h-5',
        shape === 'round' ? 'rounded-full' : 'rounded-md',
        VARIANT_CLASSES[variant],
        className
      )}
      title={label}
      aria-label={label}
      {...props}
    />
  );
}
