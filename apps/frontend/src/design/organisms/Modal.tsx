import type { ReactElement, ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';

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
}

/**
 * Fenêtre modale basée sur Base UI Dialog. Utilisable en mode non contrôlé (avec `trigger`)
 * ou contrôlé (`open`/`onOpenChange`, trigger externe).
 */
export function Modal({ title, trigger, children, open, onOpenChange }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger render={trigger} /> : null}
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-scrim backdrop-blur-sm transition-opacity duration-300 ease-out-quart data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border border-border bg-surface-raised p-6 text-text transition-[opacity,transform] duration-300 ease-out-quart data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-title">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Fermer"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-opacity duration-150 ease-out-quart hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-80"
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
