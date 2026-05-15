import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuthModalStore } from '../../stores/authModalStore';
import { ModalErrorFallback } from '../ErrorFallback';

const AuthModal = lazy(() => import('../AuthModal').then((m) => ({ default: m.AuthModal })));

// Renders the (lazy) AuthModal whenever the shared store is open. Mounted
// once at the player page level — multiple unauthenticated callers (Like,
// Library) open the same modal without coordinating between themselves.

export function AuthModalHost() {
  const isOpen = useAuthModalStore((s) => s.isOpen);
  const close = useAuthModalStore((s) => s.close);

  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <ErrorBoundary
        FallbackComponent={(props) => <ModalErrorFallback {...props} onClose={close} />}
      >
        <AuthModal isOpen={isOpen} onClose={close} />
      </ErrorBoundary>
    </Suspense>
  );
}
