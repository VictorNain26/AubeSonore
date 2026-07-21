import type { ReactElement, ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';

export interface ModalProps {
  title: string;
  trigger?: ReactElement;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Modal({ title, trigger, children, open, onOpenChange }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger render={trigger} /> : null}
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-text/40 duration-150" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border border-border bg-surface-raised p-6 text-text focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-title">{title}</Dialog.Title>
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
