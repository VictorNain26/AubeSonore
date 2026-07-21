import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { LogIn, Info } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../design/ui/Button';
import { Menu } from '../design/ui/Menu';
import { LibraryButton } from '../components/Player/LibraryButton';
import { ThemeToggle } from './ThemeToggle';
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
    <div className="h-dvh min-h-[600px] grid grid-rows-[auto_1fr] overflow-hidden dawn-glow text-text">
      <a href="#main" className="skip-link">
        Aller au contenu principal
      </a>

      <header className="mx-auto flex w-full max-w-page items-center justify-between px-6 pt-6 pb-3 font-sans">
        <p className="font-display text-title tracking-tight">AubeSonore</p>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="icon" aria-label="À propos" onClick={() => setIsAboutOpen(true)}>
            <Info className="size-5" />
          </Button>
          <LibraryButton />

          {isLoading ? (
            <div className="size-11 animate-pulse rounded-full bg-surface-raised" />
          ) : isAuthenticated && user ? (
            <Menu
              header={
                <div className="font-sans">
                  <p className="truncate text-body font-medium">{user.name || 'Utilisateur'}</p>
                  <p className="truncate text-caption text-text-muted">{user.email}</p>
                </div>
              }
              trigger={
                <Button variant="icon" aria-label="Menu utilisateur">
                  <span className="flex size-7 items-center justify-center rounded-full bg-surface-raised text-caption font-medium">
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                </Button>
              }
              items={[{ label: 'Déconnexion', onSelect: () => void signOut() }]}
            />
          ) : (
            <Button variant="ghost" aria-label="Connexion" onClick={() => openAuthModal()}>
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Connexion</span>
            </Button>
          )}
        </div>
      </header>

      <main id="main" className="min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col">
        {children}
      </main>

      {isAboutOpen && (
        <Suspense fallback={null}>
          <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
        </Suspense>
      )}

      <Toaster
        position="bottom-center"
        duration={3000}
        toastOptions={{
          classNames: {
            toast: 'font-sans !bg-surface-raised !border-border !text-text !text-body',
            description: '!text-text-muted',
            success: 'border-l-2 border-border',
            error: 'border-l-2 border-accent',
          },
        }}
      />
    </div>
  );
}
