import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modal } from '@/lib/motion';
import { useBannerSlot } from '../stores/bannerSlotStore';
import { PWAInstallBannerView } from '../design/molecules/PWAInstallBanner';

const PWA_DISMISS_KEY = 'aubesonore_pwa_dismiss';
const SLOT_PRIORITY = 10;

/**
 * Container listening for the `beforeinstallprompt` event and gating the
 * banner through `useBannerSlot`. Renders `PWAInstallBannerView` once shown.
 */
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
          <PWAInstallBannerView onInstall={handleInstall} onDismiss={handleDismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
