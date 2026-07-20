import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { LogOut, LogIn, Info } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button, IconButton } from '../components/ui/Button';
import { LibraryButton } from '../components/Player/LibraryButton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';
import { usePlayer } from '../lib/player';
import { toastError } from '../lib/appToast';
import { useMoment } from '../hooks/useMoment';
import { MOMENT_LABELS, MOMENT_TAGLINES } from '../lib/moments';
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

function MomentLine() {
  const moment = useMoment();

  return (
    <>
      <p className="eyebrow text-ink-soft">{MOMENT_LABELS[moment]}</p>
      <p className="hidden sm:block font-text italic text-caption text-ink-faint">
        {MOMENT_TAGLINES[moment]}
      </p>
    </>
  );
}

// Le point de la marque devient témoin d'antenne : il respire quand
// le flux joue.
function OnAirDot() {
  const isPlaying = usePlayer((s) => s.isPlaying);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2.5 rounded-full bg-accent-dawn mr-2 align-baseline',
        isPlaying && 'animate-breathe'
      )}
    />
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
      toastError('Ce lien est invalide ou a expiré. Demandez un nouveau lien.');
    }

    const token = readResetTokenFromUrl();
    if (token) {
      openAuthModal({ resetToken: token });
    }

    window.history.replaceState({}, '', '/');
  }, [openAuthModal]);

  return (
    <div className="h-dvh min-h-[600px] grid grid-rows-[auto_1fr] text-ink overflow-hidden">
      {/* Skip-link for keyboard users */}
      <a href="#main" className="sr-only-focusable">
        Aller au contenu principal
      </a>

      <header className="mx-auto w-full max-w-page px-6 pt-6 pb-3 flex items-start justify-between">
        <div>
          <p className="font-display text-lead tracking-tight">
            <OnAirDot />
            AubeSonore
          </p>
          <MomentLine />
        </div>

        <div className="flex items-center gap-1">
          <IconButton onClick={() => setIsAboutOpen(true)} label="À propos">
            <Info />
          </IconButton>
          <LibraryButton />

          {isLoading ? (
            <div className="size-8 skeleton rounded-full" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="Menu utilisateur">
                  <div className="size-7 rounded-full bg-paper-raised flex items-center justify-center">
                    <span className="text-caption font-medium text-ink">
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </IconButton>
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
                  <LogOut className="size-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ink" aria-label="Connexion" onClick={() => openAuthModal()}>
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

      {/* Fixed-position overlay: kept last so it never occupies a grid row */}
      <Toaster
        position="bottom-center"
        duration={3000}
        toastOptions={{
          classNames: {
            toast: 'panel !text-ink !text-body',
            description: '!text-ink-soft',
            success: 'toast-success',
            error: 'toast-danger',
          },
        }}
      />
    </div>
  );
}
