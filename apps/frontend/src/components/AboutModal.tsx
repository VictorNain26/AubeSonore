import { Info, Globe, Music, MessageSquare, Mail, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

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
                className="fixed inset-0 bg-overlay/60 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-x-4 top-1/2 max-w-sm mx-auto z-50"
                initial={{ opacity: 0, y: '-48%', scale: 0.96 }}
                animate={{ opacity: 1, y: '-50%', scale: 1 }}
                exit={{ opacity: 0, y: '-48%', scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                <div className="glass-strong rounded-2xl shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="px-5 pt-5 pb-4 border-b border-foreground/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
                          <Info className="w-5 h-5 text-foreground/60" />
                        </div>
                        <div>
                          <Dialog.Title className="text-lg font-medium text-foreground">
                            À propos
                          </Dialog.Title>
                          <Dialog.Description className="text-xs text-foreground/40">
                            AubeSonore
                          </Dialog.Description>
                        </div>
                      </div>
                      <Dialog.Close
                        className={cn(
                          'p-2 rounded-full cursor-pointer',
                          'text-foreground/40 hover:text-foreground hover:bg-foreground/10',
                          'transition-all duration-200'
                        )}
                        aria-label="Fermer"
                      >
                        <X className="w-5 h-5" />
                      </Dialog.Close>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-5 py-5 space-y-5">
                    {/* Description */}
                    <p className="text-sm text-foreground/70 leading-relaxed">
                      AubeSonore est une webradio indépendante dédiée à la découverte musicale, hors
                      des sentiers battus : nous sélectionnons pour vous des sons rares, des
                      artistes émergents et des classiques oubliés, et son ambiance suit la lumière
                      du jour, entre aube et nuit.
                    </p>

                    {/* Social links */}
                    <div>
                      <p className="text-xs text-foreground/40 uppercase tracking-widest mb-3">
                        Nous retrouver
                      </p>
                      <div className="flex gap-3">
                        {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                          <a
                            key={label}
                            href={href}
                            aria-label={label}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-xl',
                              'bg-foreground/5 hover:bg-foreground/10 border border-foreground/5',
                              'text-foreground/50 hover:text-foreground',
                              'transition-all duration-200 text-xs'
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-2 text-xs text-foreground/40">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {/* TODO: replace with real contact email */}
                      <a
                        href="mailto:contact@aubesonore.fr"
                        className="hover:text-foreground/70 transition-colors"
                      >
                        contact@aubesonore.fr
                      </a>
                    </div>
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
