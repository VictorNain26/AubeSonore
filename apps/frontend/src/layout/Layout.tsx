import { useState, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { LogOut, LogIn, BarChart3 } from 'lucide-react';
import { StatsModal } from '../components/StatsModal';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isStatsOpen, setIsStatsOpen] = useState(false);

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

      {/* Header - Logo centered, stats left, auth right */}
      <header className="shrink-0 py-4 md:py-5 px-4 relative z-20">
        {/* Left: Stats button */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <button
            onClick={() => setIsStatsOpen(true)}
            className={cn(
              'p-2 rounded-full cursor-pointer',
              'text-white/40 hover:text-white hover:bg-white/10',
              'transition-all duration-200'
            )}
            title="Mes statistiques"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Title */}
        <h1 className="text-center text-sm md:text-xl font-light tracking-[0.25em] md:tracking-[0.35em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white/60 via-white/80 to-white/60">
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

                {/* User Menu Popover */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      {/* Invisible click-away backdrop */}
                      <div
                        className="fixed inset-0 z-[200]"
                        onClick={() => setIsUserMenuOpen(false)}
                      />

                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 z-[201] bg-black/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden"
                      >
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm font-medium text-white truncate">
                            {user.name || 'Utilisateur'}
                          </p>
                          <p className="text-xs text-white/50 truncate">{user.email}</p>
                        </div>

                        {/* Logout */}
                        <div className="p-1">
                          <button
                            onClick={handleSignOut}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
                              'text-red-400 hover:text-red-300 hover:bg-white/5',
                              'transition-all duration-200 cursor-pointer text-sm'
                            )}
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Déconnexion</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
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
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Footer */}
      <footer className="shrink-0 py-3 md:py-4">
        <p className="text-center text-[10px] md:text-xs text-muted-foreground/50 tracking-widest">
          AubeSonore | Éveillez vos sens
        </p>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Stats Modal */}
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
    </div>
  );
}
