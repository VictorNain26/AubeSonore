import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSleepTimer } from '../../stores/sleepTimerStore';

const PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
] as const;

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SleepTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ bottom: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { isActive, remainingMs, mode, start, startEndOfTrack, cancel } = useSleepTimer();

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isOpen]);

  const handleSelect = (minutes: number) => {
    start(minutes);
    setIsOpen(false);
  };

  const handleEndOfTrack = () => {
    startEndOfTrack();
    setIsOpen(false);
  };

  const handleCancel = () => {
    cancel();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 rounded-full transition-all duration-200 relative cursor-pointer',
          isActive
            ? 'text-purple-400 hover:text-purple-300 hover:bg-white/10'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        )}
        title={isActive ? 'Minuterie active' : 'Minuterie de sommeil'}
      >
        <Moon className="w-5 h-5" />
        {isActive && mode === 'timer' && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-medium tabular-nums">
            {formatCountdown(remainingMs)}
          </span>
        )}
        {isActive && mode === 'end-of-track' && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-purple-500" />
        )}
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[200]" onClick={() => setIsOpen(false)} />
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="fixed w-48 rounded-xl bg-black/95 backdrop-blur-md border border-white/10 shadow-2xl z-[300] overflow-hidden"
                style={{
                  bottom: popoverPosition.bottom,
                  left: popoverPosition.left,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="text-xs text-white/40 font-medium">Minuterie</p>
                </div>
                <div className="p-1">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.minutes}
                      onClick={() => handleSelect(preset.minutes)}
                      className={cn(
                        'w-full flex items-center px-3 py-2 rounded-lg text-left text-sm cursor-pointer',
                        'transition-all duration-200',
                        'text-white/70 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    onClick={handleEndOfTrack}
                    className={cn(
                      'w-full flex items-center px-3 py-2 rounded-lg text-left text-sm cursor-pointer',
                      'transition-all duration-200',
                      'text-white/70 hover:text-white hover:bg-white/5'
                    )}
                  >
                    Fin du morceau
                  </button>

                  {isActive && (
                    <button
                      onClick={handleCancel}
                      className={cn(
                        'w-full flex items-center px-3 py-2 rounded-lg text-left text-sm cursor-pointer',
                        'transition-all duration-200 mt-1 border-t border-white/5 pt-2',
                        'text-red-400/80 hover:text-red-400 hover:bg-white/5'
                      )}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </>,
          document.body
        )}
    </div>
  );
}
