import { Mail } from 'lucide-react';
import { Modal } from './Modal';

interface AboutModalProps {
  /** Whether the modal is currently shown. */
  isOpen: boolean;
  /** Called when the modal requests to close (backdrop, escape, close button). */
  onClose: () => void;
}

/**
 * Static "about" modal presenting AubeSonore and a contact email.
 */
export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <Modal title="AubeSonore" open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <div className="space-y-5">
        <p className="text-body text-text-muted leading-relaxed">
          AubeSonore diffuse des sons rares, des artistes émergents et des classiques oubliés. Les
          couleurs du site suivent la lumière du jour, de l&apos;aube à la nuit.
        </p>
        <div className="flex items-center gap-2 text-caption text-text-faint">
          <Mail className="size-4 shrink-0" />
          <a href="mailto:contact@aubesonore.fr" className="text-accent hover:underline">
            contact@aubesonore.fr
          </a>
        </div>
      </div>
    </Modal>
  );
}
