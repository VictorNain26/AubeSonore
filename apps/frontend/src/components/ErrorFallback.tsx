import type { FallbackProps } from 'react-error-boundary';
import { Button } from './ui/Button';
import { ModalShell } from './ui/ModalShell';

export function PlayerErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="rule w-full max-w-lg mx-auto pt-6 text-center">
      <p className="font-display text-title text-ink">{"La lecture s'est interrompue"}</p>
      <p className="mt-2 text-body text-ink-soft">Rechargez ou réessayez dans un instant.</p>
      <Button variant="ink" onClick={resetErrorBoundary} className="mt-4 px-4 py-2">
        Réessayer
      </Button>
    </div>
  );
}

interface ModalErrorFallbackProps extends FallbackProps {
  onClose: () => void;
}

export function ModalErrorFallback({ onClose }: ModalErrorFallbackProps) {
  return (
    <ModalShell isOpen onClose={onClose} title="Une erreur est survenue">
      <div role="alert" className="text-center">
        <p className="text-body text-ink-soft">
          La fenêtre a rencontré un problème. Fermez-la puis rouvrez-la ; si l&apos;erreur persiste,
          rechargez la page.
        </p>
        <Button variant="ink" onClick={onClose} className="mt-4 px-4 py-2">
          Fermer
        </Button>
      </div>
    </ModalShell>
  );
}
