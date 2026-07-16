import type { ReactElement, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { modal } from '@/components/Player/motion-presets';
import { IconButton } from './Button';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidthClassName?: string;
  children: ReactNode;
}

export function ModalShell({
  isOpen,
  onClose,
  title,
  description,
  maxWidthClassName = 'max-w-md',
  children,
}: ModalShellProps): ReactElement {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-ink/20 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={modal}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'panel fixed inset-x-4 top-1/2 z-50 mx-auto w-auto p-6',
                  maxWidthClassName
                )}
                initial={{ opacity: 0, y: '-46%', scale: 0.97 }}
                animate={{ opacity: 1, y: '-50%', scale: 1 }}
                exit={{ opacity: 0, y: '-46%', scale: 0.97 }}
                transition={modal}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                  <div className="min-w-0">
                    <Dialog.Title className="font-display text-title text-ink">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="text-caption text-ink-faint">
                        {description}
                      </Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <IconButton shape="round" label="Fermer">
                      <X />
                    </IconButton>
                  </Dialog.Close>
                </div>
                <div className="max-h-[70dvh] overflow-y-auto pt-5">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
