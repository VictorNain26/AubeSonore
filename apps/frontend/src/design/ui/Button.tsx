import { forwardRef } from 'react';
import { cn } from './cn';

const VARIANT_CLASSES = {
  primary:
    'bg-accent text-white hover:bg-accent-hover active:bg-accent-active focus-visible:outline-accent',
  ghost: 'text-accent hover:bg-accent/10 active:bg-accent/20 focus-visible:outline-accent',
  icon: 'size-10 p-0 text-accent hover:bg-accent/10 active:bg-accent/20 focus-visible:outline-accent',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled ?? loading}
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
);

Button.displayName = 'Button';
