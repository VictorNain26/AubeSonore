import { useState, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { LogOut, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from '../components/AuthModal';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
  };

  return (
    <div className="min-h-dvh aurora-bg flex flex-col">
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          className: 'bg-black/80 backdrop-blur-md border border-white/10 text-white',
        }}
      />

      {/* Header - Logo centered, auth button absolute right */}
      <header className="shrink-0 py-4 md:py-5 px-4 relative">
        {/* Center: Logo - absolute center */}
        <h1 className="text-center text-sm md:text-lg font-light tracking-[0.25em] md:tracking-[0.3em] text-white/70 uppercase">
          AubeSonore
        </h1>

        {/* Right: Auth button - absolute positioned */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="relative">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
            ) : isAuthenticated && user ? (
              <>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-full cursor-pointer',
                    'bg-white/5 hover:bg-white/10 border border-white/10',
                    'transition-all duration-200'
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-white/80">
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>

              </>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer',
                  'bg-white/5 hover:bg-white/10',
                  'border border-white/10',
                  'transition-all duration-200 text-sm text-white/70 hover:text-white'
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
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-3 md:py-4">
        <p className="text-center text-[10px] md:text-xs text-muted-foreground/50 tracking-widest">
          Éveillez vos sens
        </p>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* User Menu Modal */}
      {isUserMenuOpen && user && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={() => setIsUserMenuOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-xs mx-auto z-[201]">
            <div className="bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* User Info */}
              <div className="px-5 py-4 border-b border-white/10 text-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-medium text-white/80">
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-base font-medium text-white truncate">
                  {user.name || 'Utilisateur'}
                </p>
                <p className="text-sm text-white/50 truncate">{user.email}</p>
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={handleSignOut}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                    'text-red-400 hover:text-red-300 hover:bg-white/5',
                    'transition-all duration-200 cursor-pointer'
                  )}
                >
                  <LogOut className="w-5 h-5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
