import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import { LogOut, LogIn, BarChart3 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/DropdownMenu';

const StatsModal = lazy(() =>
  import('../components/StatsModal').then((m) => ({ default: m.StatsModal }))
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
  const [isStatsOpen, setIsStatsOpen] = useState(false);

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
    <div className="min-h-dvh aurora-bg flex flex-col">
      {/* Skip-link for keyboard users */}
      <a href="#main" className="sr-only-focusable">
        Aller au contenu principal
      </a>

      <Toaster
        position="bottom-center"
        theme="dark"
        duration={3000}
        toastOptions={{
          classNames: {
            toast: 'glass-strong !rounded-xl !text-foreground !text-sm',
            description: '!text-foreground/60',
            success: '!border-l-2 !border-l-[var(--color-success)]',
            error: '!border-l-2 !border-l-[var(--color-danger)]',
          },
        }}
      />

      {/* Header - Logo centered, stats left, auth right */}
      <header className="shrink-0 py-4 md:py-5 px-4 relative z-20">
        {/* Left: Stats button */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <button
            onClick={() => setIsStatsOpen(true)}
            className={cn(
              'p-2 rounded-full cursor-pointer',
              'text-foreground/40 hover:text-foreground hover:bg-foreground/10',
              'transition-all duration-200'
            )}
            title="Mes statistiques"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Title */}
        <h1 className="text-center text-sm md:text-xl font-light tracking-[0.25em] md:tracking-[0.35em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-foreground/60 via-foreground/80 to-foreground/60">
          AubeSonore
        </h1>

        {/* Right: Auth button - absolute positioned */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="relative">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-foreground/5 animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-full cursor-pointer',
                      'bg-foreground/5 hover:bg-foreground/10 border border-foreground/10',
                      'transition-all duration-200'
                    )}
                    aria-label="Menu utilisateur"
                  >
                    <div className="w-6 h-6 rounded-full bg-foreground/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-foreground/80">
                        {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name || 'Utilisateur'}
                    </p>
                    <p className="text-xs text-foreground/50 truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem intent="danger" onSelect={() => void signOut()}>
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => openAuthModal()}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer',
                  'bg-foreground/5 hover:bg-foreground/10',
                  'border border-foreground/10',
                  'transition-all duration-200 text-sm text-foreground/70 hover:text-foreground'
                )}
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Connexion</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main - scrollable content area */}
      <main id="main" className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-3 md:py-4">
        <p className="text-center text-[10px] md:text-xs text-foreground/25 tracking-widest">
          AubeSonore | Découverte musicale en direct
        </p>
      </footer>

      {isStatsOpen && (
        <Suspense fallback={null}>
          <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
