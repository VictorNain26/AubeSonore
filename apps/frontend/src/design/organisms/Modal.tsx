import type { ReactElement, ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';
import * as m from '@/paraglide/messages.js';

type ModalSize = 'md' | 'lg';

const SIZE_CLASSES: Record<ModalSize, string> = {
  md: 'w-[min(92vw,28rem)]',
  lg: 'w-[min(92vw,36rem)]',
};

export interface ModalProps {
  /** Titre affiché dans l'en-tête de la fenêtre. */
  title: string;
  /** Élément déclencheur ; omis pour un contrôle entièrement piloté par `open`. */
  trigger?: ReactElement;
  /** Contenu de la fenêtre. */
  children: ReactNode;
  /** État ouvert/fermé contrôlé (utiliser avec `onOpenChange`, sans `trigger`). */
  open?: boolean;
  /** Appelé quand l'état ouvert/fermé change. */
  onOpenChange?: (open: boolean) => void;
  /** Largeur : `md` (défaut, formulaires) ou `lg` (contenus en liste). */
  size?: ModalSize;
}

/**
 * Fenêtre modale basée sur Base UI Dialog. Utilisable en mode non contrôlé (avec `trigger`)
 * ou contrôlé (`open`/`onOpenChange`, trigger externe). La hauteur est plafonnée au
 * viewport : à charge du contenu de scroller (`overflow-y-auto` + `min-h-0`).
 */
export function Modal({ title, trigger, children, open, onOpenChange, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger render={trigger} /> : null}
      <Dialog.Portal>
        <Dialog.Backdrop className="bg-scrim ease-out-quart fixed inset-0 backdrop-blur-sm transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            'border-border bg-surface-raised text-text ease-out-quart fixed top-1/2 left-1/2 flex max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border p-6 transition-[opacity,transform] duration-300 focus-visible:outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            SIZE_CLASSES[size]
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-title">{title}</Dialog.Title>
            <Dialog.Close
              aria-label={m.close()}
              className="text-text-muted ease-out-quart hover:bg-surface focus-visible:outline-accent inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-80"
            >
              ✕
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
