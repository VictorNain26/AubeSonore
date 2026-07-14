import type { FallbackProps } from 'react-error-boundary';

export function PlayerErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="rule w-full max-w-lg mx-auto pt-6 text-center">
      <p className="font-display text-title text-ink">{"La lecture s'est interrompue"}</p>
      <p className="mt-2 text-body text-ink-soft">Rechargez ou réessayez dans un instant.</p>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="mt-4 rounded-md border border-line px-4 py-2 text-ink hover:bg-paper-raised"
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
      <div className="panel p-6 text-center max-w-sm w-full mx-4">
        <p className="font-display text-title text-ink">Une erreur est survenue.</p>
        <p className="mt-2 text-body text-ink-soft">
          Fermez cette fenêtre et réessayez dans un instant.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-md border border-line px-4 py-2 text-ink hover:bg-paper-raised"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
