import { Mail } from 'lucide-react';
import { ModalShell } from './ui/ModalShell';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
          AubeSonore diffuse des sons rares, des artistes émergents et des classiques oubliés. Les
          couleurs du site suivent la lumière du jour, de l&apos;aube à la nuit.
        </p>
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
