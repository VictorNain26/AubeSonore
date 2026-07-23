import { useShallow } from 'zustand/react/shallow';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuthModalStore } from '../stores/authModalStore';
import { ModalErrorFallback } from '../design/organisms/ErrorFallback';
import { AuthModal } from './AuthModal';

// App-level host for the AuthModal. Mounted once at App.tsx and driven
// entirely by useAuthModalStore. Every caller (header Connexion button,
// like/library flow, URL reset-password handler) opens the modal via
// the store so we never have two AuthModal instances open at once.

export function AuthModalHost() {
  const { isOpen, mode, resetToken, close } = useAuthModalStore(
    useShallow((s) => ({
      isOpen: s.isOpen,
      mode: s.mode,
      resetToken: s.resetToken,
      close: s.close,
    }))
  );

  if (!isOpen) return null;

  return (
    <ErrorBoundary FallbackComponent={(props) => <ModalErrorFallback {...props} onClose={close} />}>
      <AuthModal
        isOpen={isOpen}
        onClose={close}
        defaultMode={mode}
        {...(resetToken && { resetToken })}
      />
    </ErrorBoundary>
  );
}
