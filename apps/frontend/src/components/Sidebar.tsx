import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Heart,
  Radio,
  Music,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: number;
}

const navigation: NavItem[] = [
  { icon: Home, label: 'Accueil', href: '/' },
  { icon: Radio, label: 'Radio Live', href: '/live' },
  { icon: Heart, label: 'Favoris', href: '/favorites' },
  { icon: Music, label: 'Découvrir', href: '/discover' },
  { icon: Settings, label: 'Paramètres', href: '/settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const { user, isAuthenticated } = useAuth();

  const toggleExpanded = (): void => setIsExpanded(!isExpanded);
  const toggleMobile = (): void => setIsMobileOpen(!isMobileOpen);

  const SidebarContent = (): React.ReactElement => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <h1 className="text-xl font-bold text-white">OurMusic</h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item, index) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 h-12 text-white/70 hover:text-white hover:bg-white/10',
                !isExpanded && 'justify-center px-2',
              )}
            >
              <item.icon className="w-5 h-5" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge && isExpanded && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto bg-accent text-xs px-2 py-1 rounded-full"
                >
                  {item.badge}
                </motion.span>
              )}
            </Button>
          </motion.div>
        ))}
      </nav>

      {/* User Section */}
      {isAuthenticated && (
        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 h-12 text-white/70 hover:text-white hover:bg-white/10',
              !isExpanded && 'justify-center px-2',
            )}
          >
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden flex-1 text-left"
                >
                  <div className="text-sm font-medium text-white">
                    {user?.name ?? user?.email}
                  </div>
                  <div className="text-xs text-white/50">
                    Membre Premium
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      )}

      {/* Collapse Button */}
      <div className="p-4 border-t border-white/10 hidden lg:block">
        <Button
          variant="ghost"
          onClick={toggleExpanded}
          className="w-full justify-center h-10 text-white/70 hover:text-white hover:bg-white/10"
        >
          {isExpanded ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        onClick={toggleMobile}
        className="fixed top-4 left-4 z-50 lg:hidden bg-black/50 backdrop-blur-sm"
      >
        {isMobileOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <Menu className="w-5 h-5 text-white" />
        )}
      </Button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={toggleMobile}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 280 : 80 }}
        className={cn(
          'hidden lg:flex flex-col h-full bg-gradient-to-b from-background to-background/95 ' +
          'border-r border-white/10 backdrop-blur-xl',
          className,
        )}
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={
              'fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-background to-background/95 ' +
              'backdrop-blur-xl border-r border-white/10 z-50 lg:hidden'
            }
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
