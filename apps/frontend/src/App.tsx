import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthProvider } from './components/AuthProvider';
import { LikedTracksProvider } from './contexts/LikedTracksContext';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { NotificationBanner } from './components/NotificationBanner';

const PWA_DISMISS_KEY = 'aubesonore_pwa_dismiss';

function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(PWA_DISMISS_KEY) === 'true';
  });

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(PWA_DISMISS_KEY, 'true');
  }, []);

  const show = deferredPrompt && !isDismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 inset-x-4 z-[100] flex justify-center"
        >
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-3 max-w-sm w-full',
              'bg-black/80 backdrop-blur-md rounded-xl',
              'border border-white/10 shadow-2xl'
            )}
          >
            <Download className="w-5 h-5 text-white/60 shrink-0" />
            <p className="text-sm text-white/70 flex-1">Installer AubeSonore</p>
            <button
              onClick={handleInstall}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer',
                'bg-white/10 hover:bg-white/15 text-white',
                'border border-white/10 transition-all duration-200'
              )}
            >
              Installer
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LikedTracksProvider>
        <Layout>
          <HomePage />
        </Layout>
        <PWAInstallBanner />
        <NotificationBanner />
      </LikedTracksProvider>
    </AuthProvider>
  );
}
