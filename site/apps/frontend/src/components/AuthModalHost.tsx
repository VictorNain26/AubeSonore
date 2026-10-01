import { lazy, Suspense, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuthModalStore } from '../stores/authModalStore';
import { useAuthStore } from '../stores/authStore';
import { takePendingKeep } from '../lib/pendingKeep';
import { ModalErrorFallback } from '../design/organisms/ErrorFallback';
// Loaded on first open: the sign-in code is not needed to listen.
const AuthModal = lazy(() => import('./AuthModal').then((mod) => ({ default: mod.AuthModal })));

// App-level host for the AuthModal. Mounted once at App.tsx and driven
// entirely by useAuthModalStore. Every caller (header Connexion button,
// like/library flow, URL reset-password handler) opens the modal via
// the store so we never have two AuthModal instances open at once.

export function AuthModalHost() {
  const { isOpen, mode, resetToken, keepTitle, close } = useAuthModalStore(
    useShallow((s) => ({
      isOpen: s.isOpen,
      mode: s.mode,
      resetToken: s.resetToken,
      keepTitle: s.keepTitle,
      close: s.close,
    }))
  );

  // Remounted at each opening (it reads its mode then), kept mounted while it
  // closes so the exit transition can play.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setSession((n) => n + 1);
  }

  if (session === 0) return null;

  // Closed without signing in: forget the track they wanted to keep.
  const onClose = () => {
    if (!useAuthStore.getState().isAuthenticated) takePendingKeep();
    close();
  };

  return (
    <ErrorBoundary
      FallbackComponent={(props) => <ModalErrorFallback {...props} onClose={onClose} />}
    >
      <Suspense fallback={null}>
        <AuthModal
          key={session}
          isOpen={isOpen}
          onClose={onClose}
          defaultMode={mode}
          {...(resetToken && { resetToken })}
          {...(keepTitle && { keepTitle })}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
