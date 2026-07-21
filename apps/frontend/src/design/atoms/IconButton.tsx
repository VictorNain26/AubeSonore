import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Libellé accessible, exposé en `aria-label` (le bouton n'a pas de texte visible). */
  label: string;
  /** Marque le bouton comme sélectionné (couleur accent). */
  active?: boolean;
  /** Masque le bouton jusqu'au survol/focus du groupe parent (`group`). */
  reveal?: boolean;
  /** Icône du bouton. */
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const REVEAL =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100';

/**
 * Bouton icône 44px basé sur `Button variant="icon"`, avec états `active` et `reveal`
 * (masqué jusqu'au survol/focus d'un parent `.group`).
 */
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
