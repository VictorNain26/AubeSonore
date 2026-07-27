import { Pause, Play } from 'lucide-react';
import { CoverGlyph } from '../atoms/CoverGlyph';
import { IconButton } from '../atoms/IconButton';
import { cn } from '@/lib/utils';

export interface MiniPlayerProps {
  /** Titre du morceau en cours, `undefined` tant que l'antenne n'a rien renvoyé. */
  title?: string | undefined;
  /** Artiste du morceau en cours. */
  artist?: string | undefined;
  /** URL de pochette ; `CoverGlyph` prend le relais quand elle est absente. */
  artworkUrl?: string | null;
  /** État de lecture, qui pilote l'icône et le libellé du bouton. */
  isPlaying: boolean;
  /** Bascule lecture/arrêt du flux. */
  onTogglePlay: () => void;
  className?: string;
}

/**
 * Barre de lecture compacte affichée hors de la page d'accueil : seconde vue
 * du même état de lecture, sans logique audio propre — le flux n'est jamais
 * interrompu par une navigation.
 */
export function MiniPlayer({
  title,
  artist,
  artworkUrl,
  isPlaying,
  onTogglePlay,
  className,
}: MiniPlayerProps) {
  const label = isPlaying ? 'Mettre en pause' : 'Écouter le direct';

  return (
    <div
      className={cn(
        'bg-surface-raised border-border fixed inset-x-0 bottom-0 z-40 border-t',
        'flex items-center gap-3 px-4 py-2',
        className
      )}
    >
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt={title ?? 'Pochette'}
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <CoverGlyph seed={`${artist ?? ''}|${title ?? ''}`} size="sm" />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-body text-text truncate">{title ?? '—'}</p>
        <p className="text-caption text-text-muted truncate">{artist ?? ''}</p>
      </div>

      <IconButton label={label} onClick={onTogglePlay}>
        {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
      </IconButton>
    </div>
  );
}
