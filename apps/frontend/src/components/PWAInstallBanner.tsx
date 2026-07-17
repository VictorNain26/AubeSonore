import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download } from 'lucide-react';
import { modal } from '@/lib/motion';
import { IconButton } from './ui/Button';
import { useBannerSlot } from '../stores/bannerSlotStore';

const PWA_DISMISS_KEY = 'aubesonore_pwa_dismiss';
const SLOT_PRIORITY = 10;

export function PWAInstallBanner() {
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

  const handleInstall = useCallback(() => {
    void (async () => {
      if (!deferredPrompt) return;
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    })();
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(PWA_DISMISS_KEY, 'true');
  }, []);

  const show = useBannerSlot('pwa', SLOT_PRIORITY, !!deferredPrompt && !isDismissed);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={modal}
          className="fixed bottom-4 inset-x-4 z-50 flex justify-center"
        >
          <div className="panel flex items-center gap-3 px-4 py-3 max-w-sm w-full">
            <Download className="size-5 text-ink-faint shrink-0" />
            <p className="text-body text-ink flex-1">Installer AubeSonore</p>
            <button
              onClick={handleInstall}
              className="text-body font-medium text-accent hover:underline cursor-pointer"
            >
              Installer
            </button>
            <IconButton shape="round" onClick={handleDismiss} label="Fermer">
              <X />
            </IconButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
