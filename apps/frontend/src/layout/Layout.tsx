import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import { LogOut, LogIn, Info } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button, IconButton } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';
import { useMoment } from '../hooks/useMoment';
import { MOMENT_LABELS } from '../lib/moments';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/DropdownMenu';

const AboutModal = lazy(() =>
  import('../components/AboutModal').then((m) => ({ default: m.AboutModal }))
);

interface LayoutProps {
  children: ReactNode;
}

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

function MomentLine() {
  const moment = useMoment();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p className="text-caption tracking-widest uppercase text-ink-soft">
      {MOMENT_LABELS[moment]} <span className="text-ink-faint">— {timeFormatter.format(now)}</span>
    </p>
  );
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
      toast.error('Ce lien est invalide ou a expiré. Demandez un nouveau lien.');
    }

    const token = readResetTokenFromUrl();
    if (token) {
      openAuthModal({ resetToken: token });
    }

    window.history.replaceState({}, '', '/');
  }, [openAuthModal]);

  return (
    <div className="min-h-dvh flex flex-col bg-paper text-ink">
      {/* Skip-link for keyboard users */}
      <a href="#main" className="sr-only-focusable">
        Aller au contenu principal
      </a>

      <Toaster
        position="bottom-center"
        duration={3000}
        toastOptions={{
          classNames: {
            toast: 'panel !text-ink !text-body',
            description: '!text-ink-soft',
            success: '!border-l-2 !border-l-[var(--color-success)]',
            error: '!border-l-2 !border-l-[var(--color-danger)]',
          },
        }}
      />

      <header className="mx-auto w-full max-w-[640px] px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <p className="font-display text-lead tracking-tight">AubeSonore</p>
          <MomentLine />
        </div>

        <div className="flex items-center gap-1">
          <IconButton onClick={() => setIsAboutOpen(true)} label="À propos">
            <Info />
          </IconButton>

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-paper-raised animate-pulse" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 p-2 rounded-md text-ink-faint hover:text-ink hover:bg-paper-raised transition-colors cursor-pointer"
                  aria-label="Menu utilisateur"
                >
                  <div className="h-7 w-7 rounded-full bg-paper-raised flex items-center justify-center">
                    <span className="text-caption font-medium text-ink">
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-body font-medium text-ink truncate">
                    {user.name || 'Utilisateur'}
                  </p>
                  <p className="text-caption text-ink-soft truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem intent="danger" onSelect={() => void signOut()}>
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ink" onClick={() => openAuthModal()}>
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Connexion</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main - scrollable content area */}
      <main id="main" className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-[640px] px-6 py-6">
        <div className="rule mb-4" />
        <p className="text-caption text-ink-faint tracking-widest">
          AubeSonore — Découverte musicale émergente
        </p>
      </footer>

      {isAboutOpen && (
        <Suspense fallback={null}>
          <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
