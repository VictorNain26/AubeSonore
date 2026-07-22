import { Heart, Share2 } from 'lucide-react';
import { Thumbnail } from '../atoms/Thumbnail';
import { IconButton } from '../atoms/IconButton';

export interface TrackRailItemProps {
  /** Titre du morceau. */
  title: string;
  /** Nom de l'artiste. */
  artist: string;
  /** URL de la pochette ; miniature de repli si absente. */
  art?: string;
  /** Le morceau est-il déjà dans les favoris. */
  isLiked: boolean;
  /** Requête like/unlike en cours (désactive le bouton). */
  isLiking: boolean;
  /** Appelé au clic sur le bouton favori. */
  onToggle: () => void;
  /** Appelé au clic sur le bouton partager. */
  onShare: () => void;
}

/**
 * Ligne d'une piste de morceaux récents : miniature, titre/artiste tronqués,
 * actions favori et partage révélées au survol/focus.
 */
export function TrackRailItem({
  title,
  artist,
  art,
  isLiked,
  isLiking,
  onToggle,
  onShare,
}: TrackRailItemProps) {
  return (
    <div role="listitem" className="group flex w-72 shrink-0 items-center gap-3 py-3">
      <Thumbnail
        {...(art !== undefined ? { src: art } : {})}
        size="md"
        seed={`${artist}|${title}`}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body text-text-muted">{title}</p>
        <p className="truncate text-caption text-text-faint">{artist}</p>
      </div>

      <IconButton
        label={isLiked ? 'Retirer de mes morceaux' : 'Ajouter à mes morceaux'}
        active={isLiked}
        reveal
        disabled={isLiking}
        onClick={onToggle}
      >
        <Heart className="size-5" fill={isLiked ? 'currentColor' : 'none'} />
      </IconButton>

      <IconButton label="Partager" reveal onClick={onShare}>
        <Share2 className="size-5" />
      </IconButton>
    </div>
  );
}
