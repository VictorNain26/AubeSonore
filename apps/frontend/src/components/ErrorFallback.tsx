import type { FallbackProps } from 'react-error-boundary';

export function PlayerErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="w-full max-w-lg mx-auto p-6 text-center text-foreground/80">
      <p className="mb-3">Lecteur indisponible.</p>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/15 border border-foreground/10"
      >
        Réessayer
      </button>
    </div>
  );
}

interface ModalErrorFallbackProps extends FallbackProps {
  onClose: () => void;
}

export function ModalErrorFallback({ onClose }: ModalErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay/60"
    >
      <div className="p-6 rounded-xl bg-overlay/80 text-foreground/80 border border-foreground/10 max-w-sm w-full mx-4">
        <p className="mb-3">Une erreur est survenue.</p>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/15 border border-foreground/10"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
