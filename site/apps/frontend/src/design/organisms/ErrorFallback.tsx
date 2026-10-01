import { useState } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { Button } from '../atoms/Button';
import { Modal } from './Modal';
import * as m from '@/paraglide/messages.js';

/**
 * Error boundary fallback shown when the player crashes. Offers a single
 * retry action wired to the boundary's `resetErrorBoundary`.
 */
export function PlayerErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="border-border mx-auto w-full max-w-lg border-t pt-6 text-center">
      <p className="font-display text-title text-text">{m.error_player_title()}</p>
      <p className="text-body text-text-muted mt-2">{m.error_player_body()}</p>
      <Button variant="primary" onClick={resetErrorBoundary} className="mt-4">
        {m.error_retry()}
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
    <Modal title={m.error_generic()} open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <div role="alert" className="text-center">
        <p className="text-body text-text-muted">{m.error_modal_body()}</p>
        <Button variant="primary" onClick={handleClose} className="mt-4">
          {m.close()}
        </Button>
      </div>
    </Modal>
  );
}
