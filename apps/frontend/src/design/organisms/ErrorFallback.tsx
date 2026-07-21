import { useState } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { Button } from '../design/atoms/Button';
import { Modal } from '../design/organisms/Modal';

/**
 * Error boundary fallback shown when the player crashes. Offers a single
 * retry action wired to the boundary's `resetErrorBoundary`.
 */
export function PlayerErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="border-t border-border w-full max-w-lg mx-auto pt-6 text-center">
      <p className="font-display text-title text-text">{"La lecture s'est interrompue"}</p>
      <p className="mt-2 text-body text-text-muted">Rechargez ou réessayez dans un instant.</p>
      <Button variant="primary" onClick={resetErrorBoundary} className="mt-4">
        Réessayer
      </Button>
    </div>
  );
}

interface ModalErrorFallbackProps extends FallbackProps {
  /** Called after the fallback modal is dismissed, on top of closing itself. */
  onClose: () => void;
}

/**
 * Error boundary fallback for content shown in a modal. Self-manages its
 * `open` state so it can close before notifying the parent via `onClose`.
 */
export function ModalErrorFallback({ onClose }: ModalErrorFallbackProps) {
  const [isOpen, setIsOpen] = useState(true);
  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };
  return (
    <Modal title="Une erreur est survenue" open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <div role="alert" className="text-center">
        <p className="text-body text-text-muted">
          La fenêtre a rencontré un problème. Fermez-la puis rouvrez-la ; si l&apos;erreur persiste,
          rechargez la page.
        </p>
        <Button variant="primary" onClick={handleClose} className="mt-4">
          Fermer
        </Button>
      </div>
    </Modal>
  );
}
