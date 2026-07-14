import { Info, Globe, Music, MessageSquare, Mail, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { modal } from './Player/motion-presets';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// TODO: replace placeholder URLs and labels with real social links before going live
const SOCIAL_LINKS = [
  {
    icon: Globe,
    label: 'Instagram',
    href: '#', // TODO: https://instagram.com/aubesonore
  },
  {
    icon: Music,
    label: 'Spotify',
    href: '#', // TODO: https://open.spotify.com/user/aubesonore
  },
  {
    icon: MessageSquare,
    label: 'Discord',
    href: '#', // TODO: https://discord.gg/aubesonore
  },
] as const;

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-ink/20 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={modal}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="panel fixed inset-x-4 top-1/2 w-full max-w-md mx-auto p-6 z-50"
                initial={{ opacity: 0, y: '-46%', scale: 0.97 }}
                animate={{ opacity: 1, y: '-50%', scale: 1 }}
                exit={{ opacity: 0, y: '-46%', scale: 0.97 }}
                transition={modal}
              >
                {/* Header */}
                <div className="pb-4 border-b border-line">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-paper-raised flex items-center justify-center">
                        <Info className="w-5 h-5 text-ink-soft" />
                      </div>
                      <div>
                        <Dialog.Title className="font-display text-title text-ink">
                          À propos
                        </Dialog.Title>
                        <Dialog.Description className="text-caption text-ink-faint">
                          AubeSonore
                        </Dialog.Description>
                      </div>
                    </div>
                    <Dialog.Close
                      className={cn(
                        'p-2 rounded-full cursor-pointer',
                        'text-ink-faint hover:text-ink hover:bg-paper-raised',
                        'transition-colors'
                      )}
                      aria-label="Fermer"
                    >
                      <X className="w-5 h-5" />
                    </Dialog.Close>
                  </div>
                </div>

                {/* Content */}
                <div className="pt-5 space-y-5">
                  {/* Description */}
                  <p className="text-body text-ink-soft leading-relaxed">
                    AubeSonore est une webradio indépendante dédiée à la découverte musicale, hors
                    des sentiers battus : nous sélectionnons pour vous des sons rares, des artistes
                    émergents et des classiques oubliés, et son ambiance suit la lumière du jour,
                    entre aube et nuit.
                  </p>

                  {/* Social links */}
                  <div>
                    <p className="text-caption text-ink-faint uppercase tracking-widest mb-3">
                      Nous retrouver
                    </p>
                    <div className="flex gap-3">
                      {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                        <a
                          key={label}
                          href={href}
                          aria-label={label}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md',
                            'border border-line text-ink-soft hover:text-ink hover:bg-paper-raised',
                            'transition-colors text-caption'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="flex items-center gap-2 text-caption text-ink-faint">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {/* TODO: replace with real contact email */}
                    <a href="mailto:contact@aubesonore.fr" className="text-accent hover:underline">
                      contact@aubesonore.fr
                    </a>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
