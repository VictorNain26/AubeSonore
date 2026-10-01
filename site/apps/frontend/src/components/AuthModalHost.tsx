import { lazy, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuthModalStore } from '../stores/authModalStore';
import { ModalErrorFallback } from '../design/organisms/ErrorFallback';
// Loaded on first open: the sign-in code is not needed to listen.
const AuthModal = lazy(() => import('./AuthModal').then((mod) => ({ default: mod.AuthModal })));

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
      <Suspense fallback={null}>
        <AuthModal
          isOpen={isOpen}
          onClose={close}
          defaultMode={mode}
          {...(resetToken && { resetToken })}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
