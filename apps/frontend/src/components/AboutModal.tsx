import { Globe, Music, MessageSquare, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModalShell } from './ui/ModalShell';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOCIAL_LINKS = [
  { icon: Globe, label: 'Instagram', href: '#' },
  { icon: Music, label: 'Spotify', href: '#' },
  { icon: MessageSquare, label: 'Discord', href: '#' },
] as const;

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="AubeSonore"
      description="Découverte musicale émergente"
    >
      <div className="space-y-5">
        <p className="text-body text-ink-soft leading-relaxed">
          AubeSonore fait se lever le jour sur la musique restée dans l&apos;ombre : sons rares,
          artistes émergents, classiques oubliés. L&apos;ambiance du site suit la lumière, de
          l&apos;aube à la nuit.
        </p>
        <div>
          <p className="eyebrow mb-3">Nous retrouver</p>
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
                <Icon className="size-4" />
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-caption text-ink-faint">
          <Mail className="size-4 shrink-0" />
          <a href="mailto:contact@aubesonore.fr" className="text-accent hover:underline">
            contact@aubesonore.fr
          </a>
        </div>
      </div>
    </ModalShell>
  );
}
