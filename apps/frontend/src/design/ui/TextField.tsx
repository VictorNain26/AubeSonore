import type { ComponentProps } from 'react';
import { Field } from '@base-ui/react/field';
import { cn } from './cn';

export interface TextFieldProps extends ComponentProps<typeof Field.Control> {
  label: string;
  error?: string;
}

export function TextField({ label, error, className, ...props }: TextFieldProps) {
  return (
    <Field.Root invalid={error !== undefined} className="flex w-full flex-col gap-1.5">
      <Field.Label className="text-caption text-text-muted">{label}</Field.Label>
      <Field.Control
        className={cn(
          'h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text',
          'transition-colors duration-150 ease-out-quart placeholder:text-text-faint',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          'disabled:pointer-events-none disabled:opacity-50',
          error !== undefined && 'border-accent',
          className
        )}
        {...props}
      />
      {error !== undefined ? (
        <Field.Error className="text-caption text-accent" match>
          {error}
        </Field.Error>
      ) : null}
    </Field.Root>
  );
}
