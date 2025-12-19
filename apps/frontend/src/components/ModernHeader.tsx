import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Music,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/useAuth';
import { authClient } from '../lib/authClient';

interface ModernHeaderProps {
  onLogin: () => void;
  onRegister: () => void;
  className?: string;
}

const ModernHeader: React.FC<ModernHeaderProps> = ({
  onLogin,
  onRegister,
  className,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleLogout = async (): Promise<void> => {
    try {
      await authClient.signOut();
      setIsUserMenuOpen(false);
      window.location.reload();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const toggleUserMenu = (): void => setIsUserMenuOpen(!isUserMenuOpen);

  return (
    <header className={cn(
      'sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-white/10',
      className,
    )}>
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left Section - Logo & Search */}
        <div className="flex items-center gap-4 flex-1">
          {/* Logo for mobile when sidebar is closed */}
          <div className="lg:hidden flex items-center gap-2">
            <div className={
              'w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center'
            }>
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">OurMusic</span>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center max-w-md w-full">
            <div className="relative w-full">
              <Search className={
                'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50'
              } />
              <input
                type="text"
                placeholder="Rechercher des artistes, titres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={
                  'w-full h-10 pl-10 pr-4 bg-white/10 backdrop-blur-sm border ' +
                  'border-white/20 rounded-full text-white placeholder-white/50 ' +
                  'focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all'
                }
              />
            </div>
          </div>
        </div>

        {/* Right Section - Actions & User */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Search button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white/70 hover:text-white"
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white relative"
            >
              <Bell className="w-5 h-5" />
              <span className={
                'absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full text-xs'
              }></span>
            </Button>
          )}

          {/* Auth Section */}
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
          ) : isAuthenticated ? (
            /* User Menu */
            <div className="relative">
              <Button
                variant="ghost"
                onClick={toggleUserMenu}
                className="flex items-center gap-2 text-white/70 hover:text-white"
              >
                <div className={
                  'w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center'
                }>
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden lg:block text-sm font-medium">
                  {user?.name ?? user?.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-4 h-4" />
              </Button>

              {/* User Dropdown */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={
                      'absolute right-0 top-full mt-2 w-64 bg-card/90 backdrop-blur-xl ' +
                      'border border-white/10 rounded-lg shadow-2xl overflow-hidden'
                    }
                  >
                    {/* User Info */}
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className={
                          'w-10 h-10 bg-gradient-to-r from-primary to-accent ' +
                          'rounded-full flex items-center justify-center'
                        }>
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {user?.name ?? 'Utilisateur'}
                          </div>
                          <div className="text-xs text-white/50">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        className={
                          'w-full justify-start gap-2 text-white/70 hover:text-white hover:bg-white/10'
                        }
                      >
                        <User className="w-4 h-4" />
                        Profil
                      </Button>
                      <Button
                        variant="ghost"
                        className={
                          'w-full justify-start gap-2 text-white/70 hover:text-white hover:bg-white/10'
                        }
                      >
                        <Settings className="w-4 h-4" />
                        Paramètres
                      </Button>
                      <div className="my-2 border-t border-white/10" />
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className={
                          'w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10'
                        }
                      >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Backdrop for mobile */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[-1] md:hidden"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Login/Register Buttons */
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={onLogin}
                className="text-white/70 hover:text-white"
              >
                Connexion
              </Button>
              <Button
                variant="gradient"
                onClick={onRegister}
                className="hidden sm:inline-flex"
              >
                S'inscrire
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ModernHeader;
