import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download } from 'lucide-react';
import { modal } from '@/lib/motion';
import { Button } from '../design/atoms/Button';
import { useBannerSlot } from '../stores/bannerSlotStore';

const PWA_DISMISS_KEY = 'aubesonore_pwa_dismiss';
const SLOT_PRIORITY = 10;

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    return typeof window === 'undefined' ? false : localStorage.getItem(PWA_DISMISS_KEY) === 'true';
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
          className="fixed bottom-4 inset-x-4 z-50 flex justify-center pb-[env(safe-area-inset-bottom)]"
        >
          <div className="rounded-md border border-border bg-surface-raised flex items-center gap-3 px-4 py-3 max-w-sm w-full">
            <Download className="size-5 text-text-faint shrink-0" />
            <p className="text-body text-text flex-1">Installer AubeSonore</p>
            <Button variant="primary" onClick={handleInstall}>
              Installer
            </Button>
            <Button variant="icon" aria-label="Fermer" onClick={handleDismiss}>
              <X />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
