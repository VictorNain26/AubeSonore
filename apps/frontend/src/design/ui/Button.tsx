import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'ghost' | 'icon';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:opacity-90 px-6',
  ghost: 'text-text hover:bg-surface-raised px-4',
  icon: 'size-11 justify-center p-0 text-text hover:bg-surface-raised',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-full text-body font-medium transition-opacity duration-150 ease-out-quart',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'active:opacity-80 disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
