import { Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../atoms/Button';

export interface LibraryButtonViewProps {
  /** La bibliothèque contient au moins un titre aimé (met en accent le bouton). */
  hasLikedTracks: boolean;
  /** Appelé au clic pour ouvrir la bibliothèque (ou la modale d'auth si non connecté). */
  onOpen: () => void;
}

export function LibraryButtonView({ hasLikedTracks, onOpen }: LibraryButtonViewProps) {
  return (
    <Button
      variant="icon"
      aria-label="Ouvrir ma bibliothèque"
      onClick={onOpen}
      className={cn(hasLikedTracks && 'text-accent hover:text-accent')}
    >
      <Library className="size-5" />
    </Button>
  );
}
