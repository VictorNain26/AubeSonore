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
          className: 'bg-card/95 backdrop-blur-sm border border-border text-foreground',
        }}
      />

      {/* Header */}
      <header className="shrink-0 py-4 md:py-5 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {/* Logo */}
          <h1 className="text-sm md:text-lg font-light tracking-[0.25em] md:tracking-[0.3em] text-foreground/80 uppercase">
            AubeSonore
          </h1>

          {/* Auth */}
          <div className="relative">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
            ) : isAuthenticated && user ? (
              <>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full',
                    'bg-white/5 hover:bg-white/10 border border-white/10',
                    'transition-all text-sm text-white/80 hover:text-white'
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block max-w-[100px] truncate">
                    {user.name || user.email.split('@')[0]}
                  </span>
                </button>

                {/* User Menu Dropdown */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-black/90 backdrop-blur-md border border-white/10 shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-medium text-white truncate">
                          {user.name || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-white/50 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full',
                  'bg-gradient-to-r from-purple-600/80 to-purple-500/80',
                  'hover:from-purple-500 hover:to-purple-400',
                  'border border-purple-400/20',
                  'transition-all text-sm text-white font-medium',
                  'shadow-lg shadow-purple-500/20'
                )}
              >
                <LogIn className="w-4 h-4" />
                <span>Connexion</span>
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
    </div>
  );
}
