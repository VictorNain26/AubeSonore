import type { FallbackProps } from 'react-error-boundary';
import { Button } from './ui/Button';

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

// Volontairement sans ModalShell : ce fallback remplace une modale qui vient
// de planter et ne doit dépendre de rien d'animé ni de Radix.
export function ModalErrorFallback({ onClose }: ModalErrorFallbackProps) {
  return (
    <div role="alert" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20">
      <div className="panel p-6 text-center max-w-sm w-full mx-4">
        <p className="font-display text-title text-ink">Une erreur est survenue.</p>
        <p className="mt-2 text-body text-ink-soft">
          Fermez cette fenêtre et réessayez dans un instant.
        </p>
        <Button variant="ink" onClick={onClose} className="mt-4 px-4 py-2">
          Fermer
        </Button>
      </div>
    </div>
  );
}
