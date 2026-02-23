import { useState, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../hooks/useAuth';

const DISMISS_KEY = 'aubesonore_push_dismiss';

export function NotificationBanner() {
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();
  const { isAuthenticated } = useAuth();

  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(DISMISS_KEY) === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleEnable = useCallback(async () => {
    setIsLoading(true);
    const success = await subscribe();
    setIsLoading(false);
    if (success) {
      setIsDismissed(true);
    }
  }, [subscribe]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  }, []);

  // Only show for authenticated users, on supported browsers, not already subscribed/dismissed/denied
  const show =
    isAuthenticated && isSupported && !isSubscribed && !isDismissed && permission !== 'denied';

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
            <Bell className="w-5 h-5 text-purple-400/80 shrink-0" />
            <p className="text-sm text-white/70 flex-1">
              Recevoir les notifications des sessions live ?
            </p>
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer',
                'bg-white/10 hover:bg-white/15 text-white',
                'border border-white/10 transition-all duration-200',
                isLoading && 'animate-pulse'
              )}
            >
              Activer
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
