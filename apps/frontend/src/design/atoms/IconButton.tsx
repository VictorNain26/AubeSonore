import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Libellé accessible, exposé en `aria-label` (le bouton n'a pas de texte visible). */
  label: string;
  /** Marque le bouton comme sélectionné (couleur accent). */
  active?: boolean;
  /** Icône du bouton. */
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Bouton icône 44px basé sur `Button variant="icon"`, avec état `active` (couleur accent).
 */
export function IconButton({
  label,
  active = false,
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
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
