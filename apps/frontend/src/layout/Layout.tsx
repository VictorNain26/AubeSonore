import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LayoutView } from './LayoutView';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';
import { toastError } from '../lib/appToast';

const AboutModal = lazy(() =>
  import('../components/AboutModal').then((m) => ({ default: m.AboutModal }))
);

interface LayoutProps {
  children: ReactNode;
}

function readResetTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname !== '/reset-password') return null;
  return new URLSearchParams(window.location.search).get('token');
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, isLoading, signOut } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      isAuthenticated: s.isAuthenticated,
      isLoading: s.isLoading,
      signOut: s.signOut,
    }))
  );
  const openAuthModal = useAuthModalStore((s) => s.open);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Better Auth's forget-password emails redirect to /reset-password?token=XXX
  // (or ?error=INVALID_TOKEN). Open the modal in reset mode on first paint
  // via the global store, then clean the URL so a refresh doesn't replay it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/reset-password') return;

    const error = new URLSearchParams(window.location.search).get('error');
    if (error === 'INVALID_TOKEN') {
      toastError('Ce lien est invalide ou a expiré. Demandez un nouveau lien.');
    }

    const token = readResetTokenFromUrl();
    if (token) {
      openAuthModal({ resetToken: token });
    }

    window.history.replaceState({}, '', '/');
  }, [openAuthModal]);

  return (
    <LayoutView
      user={user}
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      onSignOut={() => void signOut()}
      onOpenAuthModal={() => openAuthModal()}
      onOpenAbout={() => setIsAboutOpen(true)}
      aboutModal={
        isAboutOpen ? (
          <Suspense fallback={null}>
            <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
          </Suspense>
        ) : null
      }
    >
      {children}
    </LayoutView>
  );
}
